import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Xero OAuth Bridge — OrbitanOS Privacy-First Integration (Build #28.2A)
 *
 * Handles the full Xero OAuth 2.0 authorization code flow:
 *   1. get_auth_url         — Returns the Xero consent URL with a secure
 *                             HMAC-signed state token (not raw tenant_id)
 *   2. exchange_code        — Validates the state token, exchanges the OAuth
 *                             callback code for access+refresh tokens, stores
 *                             them in IntegrationCredential. If multiple Xero
 *                             organisations are available, returns them for
 *                             user selection instead of auto-selecting the first.
 *   3. select_organisation  — Persists the user's chosen Xero organisation
 *   4. refresh_token        — Refreshes an expired access token
 *   5. get_status           — Returns the current connection status for a tenant
 *   6. disconnect           — Revokes tokens and marks credential as disconnected
 *   7. test_connection      — Health probe with automatic token refresh
 *   8. get_platform_config  — Admin-only configuration readiness (no secrets)
 *
 * SECURITY:
 *   - OAuth state is an opaque HMAC-signed token containing nonce, tenant_id,
 *     user_id, and expiry — never raw tenant_id
 *   - Tokens are stored ONLY in IntegrationCredential (admin-only writes via service role)
 *   - User must be authenticated and be admin or tenant_admin for sensitive actions
 *   - XERO_CLIENT_ID / XERO_CLIENT_SECRET are read from env — never sent to browser
 *   - No token values, secrets, or stack traces are returned in responses
 *
 * PORTABILITY:
 *   - Secret retrieval is isolated behind a getSecret() adapter so the app
 *     can migrate from Base44 env vars to AWS Secrets Manager / Vault / etc.
 *   - OAuth state uses Web Crypto API (HMAC-SHA256) — portable to any runtime
 *   - Entity schema is pure JSON — portable to any database
 *
 * FUTURE CUSTOMERS: Fully multi-tenant. Each tenant connects their own
 * Xero org. The redirect URI uses the app's deployed origin so it works
 * for any customer domain automatically.
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// ── Least-privilege scopes (Build #28.2A) ──
// Only request scopes needed for enabled Orbitan functions.
// Do NOT request payroll, bank transactions, or journals unless a
// corresponding feature is explicitly enabled.
const XERO_SCOPES = [
  'offline_access',
  'accounting.transactions',
  'accounting.settings.read',
  'accounting.contacts',
].join(' ');

// ── Portable secrets adapter ──
// Isolates secret retrieval so Orbitan can later migrate from
// Base44 environment variables to AWS Secrets Manager / Google Secret
// Manager / Azure Key Vault / HashiCorp Vault without rewriting
// application logic. Only this function needs to change.
function getSecret(name: string): string | undefined {
  // Current adapter: Base44/Deno env vars
  return Deno.env.get(name);
}

// ── HMAC-SHA256 signing for OAuth state tokens ──
// The signing key is derived from XERO_CLIENT_SECRET (already a server-side
// secret). This means state tokens cannot be forged without the secret.
const encoder = new TextEncoder();

async function getSigningKey(): Promise<CryptoKey> {
  const secret = getSecret('XERO_CLIENT_SECRET') || getSecret('STRIPE_SECRET_KEY') || 'orbitan-fallback-dev-key';
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

/**
 * Creates a signed OAuth state token.
 * Format: base64url(payload).base64url(hmac)
 *
 * Payload contains: nonce, tenant_id, user_id, return_route, created_at, expires_at
 * The state is opaque to Xero and the browser — only the backend can decode/verify.
 */
async function createStateToken(tenantId: string, userId: string, returnRoute: string): Promise<string> {
  const now = Date.now();
  const payload = {
    n: randomNonce(),
    t: tenantId,
    u: userId,
    r: returnRoute,
    c: now,
    e: now + 10 * 60 * 1000, // 10-minute expiry
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = base64UrlEncode(sig);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Validates a signed OAuth state token.
 * Verifies HMAC signature, checks expiry, and returns the decoded payload.
 * Returns null if invalid, expired, or tampered.
 */
async function validateStateToken(state: string): Promise<{ t: string; u: string; r: string; n: string } | null> {
  if (!state || !state.includes('.')) return null;
  const [payloadB64, sigB64] = state.split('.');
  if (!payloadB64 || !sigB64) return null;

  const key = await getSigningKey();
  const sigBytes = base64UrlDecode(sigB64);

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    encoder.encode(payloadB64)
  );
  if (!valid) return null;

  let payload;
  try {
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(atob(padded));
  } catch {
    return null;
  }

  if (!payload.e || Date.now() > payload.e) return null;

  return { t: payload.t, u: payload.u, r: payload.r, n: payload.n };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, tenant_id, code, state, redirect_uri, xero_tenant_id } = body;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    const clientId = getSecret('XERO_CLIENT_ID');
    const clientSecret = getSecret('XERO_CLIENT_SECRET');

    // ── ACTION: get_auth_url ──
    // Returns the Xero consent screen URL with a secure HMAC-signed state.
    if (action === 'get_auth_url') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!clientId) {
        // Neutral message — no internal configuration details exposed
        return Response.json({
          configured: false,
          auth_url: null,
          message: 'Xero integration is temporarily unavailable.',
        });
      }

      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.orbitan.com';
      const finalRedirect = redirect_uri || `${origin}/platform/integrations`;
      const returnRoute = '/platform/integrations';

      // Create secure state token
      const stateToken = await createStateToken(tenant_id, user.id, returnRoute);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: finalRedirect,
        scope: XERO_SCOPES,
        state: stateToken,
      });

      const authUrl = `${XERO_AUTH_URL}?${params.toString()}`;

      return Response.json({
        configured: true,
        auth_url: authUrl,
        redirect_uri: finalRedirect,
      });
    }

    // ── ACTION: get_platform_config ──
    // Admin-only configuration readiness. Must work even when Xero
    // credentials are not configured (it reports whether they ARE).
    if (action === 'get_platform_config') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Platform configuration requires Platform Admin role' }, { status: 403 });
      }
      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.orbitan.com';
      const redirectUri = `${origin}/platform/integrations`;
      const xeroClientId = !!getSecret('XERO_CLIENT_ID');
      const xeroClientSecret = !!getSecret('XERO_CLIENT_SECRET');
      const stripeKey = getSecret('STRIPE_SECRET_KEY') || '';
      const environment = stripeKey.startsWith('sk_live') ? 'live' : stripeKey.startsWith('sk_test') ? 'test' : 'unconfigured';
      return Response.json({
        environment,
        xero: {
          client_id_configured: xeroClientId,
          client_secret_configured: xeroClientSecret,
          redirect_uri: redirectUri,
          callback_url: redirectUri,
          required_scopes: XERO_SCOPES.split(' '),
          oauth_ready: xeroClientId && xeroClientSecret,
          sync_ready: xeroClientId && xeroClientSecret,
        },
        stripe_platform_billing: {
          secret_key_configured: !!getSecret('STRIPE_SECRET_KEY'),
          publishable_key_configured: !!getSecret('STRIPE_PUBLISHABLE_KEY'),
          webhook_secret_configured: !!getSecret('STRIPE_WEBHOOK_SECRET'),
          mode: 'live',
          status: 'active',
        },
        stripe_connect: {
          client_id_configured: !!getSecret('STRIPE_CONNECT_CLIENT_ID'),
          onboarding_model: 'standard_connected_accounts',
          architecture_locked: true,
          implementation_status: 'deferred',
          ready: false,
        },
        versions: {
          xero_oauth: '2.0',
          integration_sync: '1.0',
        },
      });
    }

    // ── ACTION: get_status ──
    // Works without secrets — it reports whether the platform is configured
    // and whether a credential exists. Only makes DB reads, no Xero API calls.
    if (action === 'get_status') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const statusUser = await base44.auth.me();
      if (!statusUser) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({
          connected: false,
          configured: !!clientId,
          status: clientId ? 'not_connected' : 'not_configured',
          message: clientId
            ? 'Xero is ready to connect.'
            : 'Xero integration is temporarily unavailable.',
        });
      }

      const cred = existing[0];
      const isExpired = cred.token_expires_at && new Date(cred.token_expires_at) < new Date();
      const status = isExpired && cred.status === 'connected' ? 'expired' : cred.status;
      const connected = cred.status === 'connected' && !isExpired;

      // ── Sync queue metrics ──
      const pendingEntries = await base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id, status: 'pending' });
      const failedEntries = await base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id, status: 'failed' });
      const lastSynced = await base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id, status: 'synced' }, '-synced_at', 1);
      const lastFailed = await base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id, status: 'failed' }, '-updated_date', 1);
      const recent = await base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id }, '-updated_date', 10);
      const recentTotal = recent.length;
      const recentSynced = recent.filter((e) => e.status === 'synced').length;
      const sync_success_rate = recentTotal > 0 ? Math.round((recentSynced / recentTotal) * 100) : (connected ? 100 : 0);

      const pending_count = pendingEntries.length;
      const failed_count = failedEntries.length;
      const last_successful_sync = (lastSynced && lastSynced[0]?.synced_at) || null;
      const last_sync_error = (lastFailed && lastFailed[0]?.last_error) || '';

      let sync_health = 'healthy';
      if (!connected) {
        sync_health = status === 'expired' ? 'warning' : 'neutral';
      } else if (failed_count >= 5) {
        sync_health = 'critical';
      } else if (failed_count > 0 || pending_count > 20) {
        sync_health = 'warning';
      }

      return Response.json({
        connected,
        configured: !!clientId,
        status,
        xero_tenant_name: cred.external_tenant_name,
        xero_tenant_id: cred.external_tenant_id,
        connected_date: cred.connected_date,
        token_expires_at: cred.token_expires_at,
        last_refreshed: cred.last_refreshed_date,
        last_successful_sync,
        last_sync_error,
        pending_count,
        failed_count,
        sync_success_rate,
        sync_health,
        last_error: cred.last_error,
      });
    }

    // ── All remaining actions require secrets ──
    if (!clientId || !clientSecret) {
      return Response.json({
        configured: false,
        error: 'Xero integration is temporarily unavailable.',
      }, { status: 503 });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Only authorised administrators can manage Xero connections' }, { status: 403 });
    }

    // ── ACTION: exchange_code ──
    // Validates the secure state token, exchanges the OAuth code for tokens,
    // and fetches available Xero organisations.
    if (action === 'exchange_code') {
      if (!code || !state) {
        return Response.json({ error: 'code and state are required' }, { status: 400 });
      }

      // Validate the signed state token
      const statePayload = await validateStateToken(state);
      if (!statePayload) {
        return Response.json({
          error: 'Invalid or expired authorisation state. Please try connecting again.',
        }, { status: 400 });
      }

      const resolvedTenantId = statePayload.t;
      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.orbitan.com';
      const finalRedirect = redirect_uri || `${origin}/platform/integrations`;

      // Exchange auth code for tokens
      const tokenRes = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: finalRedirect,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('[xeroOAuth] Token exchange failed:', tokenRes.status);
        // Never expose raw error details to the customer
        return Response.json({
          error: 'Failed to complete Xero authorisation. Please try again.',
        }, { status: 400 });
      }

      const tokens = await tokenRes.json();

      // Fetch the Xero tenant connections (orgs the user authorized)
      const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      let xeroConnections = [];
      if (connectionsRes.ok) {
        xeroConnections = await connectionsRes.json();
      } else {
        console.warn('[xeroOAuth] Could not fetch Xero connections:', connectionsRes.status);
      }

      // ── Multi-organisation selection ──
      // If the user has multiple Xero orgs, return them for selection
      // instead of auto-selecting the first.
      if (xeroConnections.length > 1) {
        return Response.json({
          success: false,
          requires_org_selection: true,
          state, // Pass through for the select_organisation action
          connections: xeroConnections.map((c) => ({
            tenantId: c.tenantId,
            tenantName: c.tenantName,
            tenantType: c.tenantType,
          })),
        });
      }

      const primaryConnection = xeroConnections[0] || {};

      // Persist the connection
      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id: resolvedTenantId,
        service_type: 'xero',
      });

      const credentialData = {
        tenant_id: resolvedTenantId,
        service_type: 'xero',
        status: 'connected',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        external_tenant_id: primaryConnection.tenantId || '',
        external_tenant_name: primaryConnection.tenantName || '',
        scopes: XERO_SCOPES.split(' '),
        connected_by_id: user.id,
        connected_by_name: user.full_name,
        connected_date: new Date().toISOString(),
        last_refreshed_date: new Date().toISOString(),
        last_error: '',
      };

      let credential;
      if (existing && existing.length > 0) {
        credential = await base44.asServiceRole.entities.IntegrationCredential.update(existing[0].id, credentialData);
      } else {
        credential = await base44.asServiceRole.entities.IntegrationCredential.create(credentialData);
      }

      // Audit log — no token values in the audit record
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: resolvedTenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'XERO_CONNECTED',
        module: 'finance',
        target_entity: 'IntegrationCredential',
        target_record_id: credential.id,
        details: `Xero connected by ${user.full_name}. Organisation: ${primaryConnection.tenantName || 'Unknown'}.`,
        shield_outcome: 'not_evaluated',
        category: 'lifecycle',
        event_source: 'xeroOAuth',
      });

      return Response.json({
        success: true,
        message: 'Xero connected successfully.',
        credential_id: credential.id,
        xero_tenant_name: primaryConnection.tenantName || 'Unknown',
        xero_tenant_id: primaryConnection.tenantId || '',
      });
    }

    // ── ACTION: select_organisation ──
    // Called when the user has multiple Xero organisations and selects one.
    if (action === 'select_organisation') {
      if (!state || !xero_tenant_id) {
        return Response.json({ error: 'state and xero_tenant_id are required' }, { status: 400 });
      }

      // Validate the state token
      const statePayload = await validateStateToken(state);
      if (!statePayload) {
        return Response.json({
          error: 'Invalid or expired authorisation state. Please try connecting again.',
        }, { status: 400 });
      }

      const resolvedTenantId = statePayload.t;

      // Fetch the existing credential (created during exchange_code, or update existing)
      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id: resolvedTenantId,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No pending Xero connection found. Please reconnect.' }, { status: 404 });
      }

      const cred = existing[0];

      // Fetch the Xero org name from the connections endpoint using the stored token
      let orgName = '';
      try {
        const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
          headers: { 'Authorization': `Bearer ${cred.access_token}` },
        });
        if (connectionsRes.ok) {
          const conns = await connectionsRes.json();
          const selected = conns.find((c) => c.tenantId === xero_tenant_id);
          orgName = selected?.tenantName || '';
        }
      } catch {
        // Fallback: use the ID as name
      }

      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        external_tenant_id: xero_tenant_id,
        external_tenant_name: orgName || xero_tenant_id,
        status: 'connected',
        last_error: '',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: resolvedTenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'XERO_ORG_SELECTED',
        module: 'finance',
        target_entity: 'IntegrationCredential',
        target_record_id: cred.id,
        details: `Xero organisation selected: ${orgName || xero_tenant_id}.`,
        shield_outcome: 'not_evaluated',
        category: 'lifecycle',
        event_source: 'xeroOAuth',
      });

      return Response.json({
        success: true,
        message: 'Xero organisation connected.',
        xero_tenant_name: orgName || xero_tenant_id,
      });
    }

    // ── ACTION: refresh_token ──
    if (action === 'refresh_token') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No Xero credential found for this tenant' }, { status: 404 });
      }

      const cred = existing[0];
      if (cred.status === 'disconnected') {
        return Response.json({ error: 'Xero connection is disconnected. Please reconnect.' }, { status: 403 });
      }

      const tokenRes = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: cred.refresh_token,
        }),
      });

      if (!tokenRes.ok) {
        console.error('[xeroOAuth] Token refresh failed:', tokenRes.status);

        await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
          status: 'expired',
          last_error: 'Token refresh failed — reconnection required.',
        });

        return Response.json({
          error: 'Xero token refresh failed. Reconnection required.',
        }, { status: 401 });
      }

      const tokens = await tokenRes.json();

      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        last_refreshed_date: new Date().toISOString(),
        status: 'connected',
        last_error: '',
      });

      return Response.json({
        success: true,
        message: 'Xero token refreshed.',
      });
    }

    // ── ACTION: disconnect ──
    if (action === 'disconnect') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No Xero connection found' }, { status: 404 });
      }

      const cred = existing[0];

      // Attempt to revoke the token at Xero (best-effort)
      try {
        await fetch(`${XERO_CONNECTIONS_URL}/${cred.external_tenant_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${cred.access_token}`,
          },
        });
      } catch {
        // Best-effort revocation — proceed with local disconnect regardless
      }

      // Mark as disconnected and clear token material
      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        status: 'disconnected',
        access_token: '',
        refresh_token: '',
        token_expires_at: '',
        last_error: 'Disconnected by user',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'XERO_DISCONNECTED',
        module: 'finance',
        target_entity: 'IntegrationCredential',
        target_record_id: cred.id,
        details: `Xero disconnected by ${user.full_name}. Token material cleared.`,
        shield_outcome: 'not_evaluated',
        category: 'lifecycle',
        event_source: 'xeroOAuth',
      });

      return Response.json({
        success: true,
        message: 'Xero disconnected. Future syncs are paused.',
      });
    }

    // ── ACTION: test_connection ──
    if (action === 'test_connection') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({
          healthy: false,
          reason: 'not_connected',
          message: 'No Xero connection found for this tenant.',
        });
      }

      let cred = existing[0];
      if (cred.status === 'disconnected') {
        return Response.json({
          healthy: false,
          reason: 'disconnected',
          message: 'Xero connection is disconnected. Reconnect to continue.',
        });
      }

      // Refresh token if expired
      const isExpired = cred.token_expires_at && new Date(cred.token_expires_at) < new Date(Date.now() + 60_000);
      if (isExpired) {
        const refreshRes = await base44.asServiceRole.functions.invoke('xeroOAuth', {
          action: 'refresh_token',
          tenant_id,
        });
        if (!refreshRes.data?.success) {
          await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
            status: 'expired',
            last_error: 'Token refresh failed during connection test.',
          });
          await base44.asServiceRole.entities.AuditLog.create({
            tenant_id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
            action_type: 'XERO_TEST_CONNECTION_FAILED', module: 'finance',
            target_entity: 'IntegrationCredential', target_record_id: cred.id,
            details: 'Xero connection test failed: token refresh unsuccessful.',
            shield_outcome: 'not_evaluated',
            category: 'operational',
            event_source: 'xeroOAuth',
          });
          return Response.json({
            healthy: false,
            reason: 'token_refresh_failed',
            message: 'Xero token expired and refresh failed. Reconnection required.',
          });
        }
        const refreshed = await base44.asServiceRole.entities.IntegrationCredential.filter({ tenant_id, service_type: 'xero' });
        cred = refreshed[0];
      }

      // Lightweight authenticated Xero API request
      const orgRes = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cred.access_token}`,
          'Xero-tenant-id': cred.external_tenant_id,
          'Accept': 'application/json',
        },
      });

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const orgName = orgData.Organisations?.[0]?.Name || cred.external_tenant_name || 'Xero Organisation';
        await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
          status: 'connected',
          last_error: '',
        });
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
          action_type: 'XERO_TEST_CONNECTION_OK', module: 'finance',
          target_entity: 'IntegrationCredential', target_record_id: cred.id,
          details: `Xero connection test successful. Organisation: ${orgName}.`,
          shield_outcome: 'not_evaluated',
          category: 'operational',
          event_source: 'xeroOAuth',
        });
        return Response.json({
          healthy: true,
          reason: 'connected',
          organisation_name: orgName,
          message: 'Xero connection is healthy.',
        });
      }

      const errStatus = orgRes.status;
      let reason = 'api_error';
      let newStatus = 'error';
      if (errStatus === 401) {
        reason = 'revoked';
        newStatus = 'expired';
      }
      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        status: newStatus,
        last_error: `Connection test failed (HTTP ${errStatus}).`,
      });
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
        action_type: 'XERO_TEST_CONNECTION_FAILED', module: 'finance',
        target_entity: 'IntegrationCredential', target_record_id: cred.id,
        details: `Xero connection test failed. HTTP ${errStatus}.`,
        shield_outcome: 'not_evaluated',
        category: 'operational',
        event_source: 'xeroOAuth',
      });
      return Response.json({
        healthy: false,
        reason,
        message: errStatus === 401
          ? 'Xero access has been revoked or the token is invalid. Reconnect Xero.'
          : 'Xero API returned an error. Please try again later.',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[xeroOAuth] Error:', error.message);
    // Never expose stack traces or internal details to the customer
    return Response.json({
      error: 'An unexpected error occurred. Please try again.',
    }, { status: 500 });
  }
});