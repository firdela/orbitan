import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { encryptToken, decryptToken, isEncryptionAvailable, sha256Hash, generateNonce } from '../../shared/cryptoUtils.ts';

/**
 * Xero OAuth Bridge — OrbitanOS Privacy-First Integration (Build #28.2B)
 *
 * Handles the full Xero OAuth 2.0 authorization code flow with:
 *   - Canonical redirect URI from XERO_REDIRECT_URI env (not derived from origin/referer)
 *   - Single-use OAuth state via OAuthTransaction entity (prevents replay)
 *   - AES-GCM token encryption at rest (via INTEGRATION_ENCRYPTION_KEY)
 *   - Structured error codes for customer-safe UX
 *
 * Actions:
 *   1. get_platform_config  — Admin-only configuration readiness (no secrets)
 *   2. get_auth_url         — Creates OAuthTransaction, returns Xero consent URL
 *   3. get_status           — Returns connection status for a tenant
 *   4. exchange_code        — Validates state, exchanges code, encrypts+stores tokens
 *   5. select_organisation  — Persists user's chosen Xero organisation (multi-org)
 *   6. refresh_token        — Refreshes expired access token (decrypt→refresh→encrypt)
 *   7. disconnect           — Revokes tokens, clears credential
 *   8. test_connection      — Health probe with automatic token refresh
 *
 * SECURITY:
 *   - OAuth state is a random nonce; only its SHA-256 hash is persisted (OAuthTransaction)
 *   - State is single-use: pending → processing → consumed (cannot be replayed)
 *   - State has a 10-minute expiry
 *   - Tokens are AES-GCM encrypted before storage (INTEGRATION_ENCRYPTION_KEY)
 *   - No token values, secrets, or stack traces in responses or audit logs
 *   - Redirect URI is backend-only (XERO_REDIRECT_URI), validated against allowlist
 *
 * CANONICAL DOMAIN: https://orbitan.io (supersedes app.orbitan.com)
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';
const XERO_REVOCATION_URL = 'https://identity.xero.com/connect/revocation';

// ── Least-privilege scopes ──
// NOTE: Xero's OAuth 2.0 (built on IdentityServer) requires `openid` to be
// present whenever `offline_access` is requested. Without `openid`, Xero
// rejects the authorization request with `invalid_scope`. This was the root
// cause of the INVALID_SCOPE error in Build #28.2C.
const XERO_SCOPES = [
  'openid',
  'offline_access',
  'accounting.transactions',
  'accounting.settings.read',
  'accounting.contacts',
].join(' ');

// ── Approved Orbitan origins allowlist ──
// The redirect URI must start with one of these.
const ALLOWED_ORIGINS = [
  'https://orbitan.io',
  'https://www.orbitan.io',
];

// ── Portable secrets adapter ──
function getSecret(name: string): string | undefined {
  return Deno.env.get(name);
}

// ── Canonical redirect URI (backend-only, from env) ──
function getRedirectUri(): string {
  const uri = getSecret('XERO_REDIRECT_URI');
  if (!uri) return '';
  // Validate: must be HTTPS, must be in allowlist
  if (!uri.startsWith('https://')) return '';
  if (!ALLOWED_ORIGINS.some(origin => uri.startsWith(origin))) return '';
  return uri;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, tenant_id, code, state, xero_tenant_id } = body;

    if (!action) {
      return Response.json({ error: 'action is required', error_code: 'CALLBACK_FAILED' }, { status: 400 });
    }

    const clientId = getSecret('XERO_CLIENT_ID');
    const clientSecret = getSecret('XERO_CLIENT_SECRET');
    const redirectUri = getRedirectUri();
    const configured = !!(clientId && clientSecret && redirectUri);

    // ── ACTION: get_platform_config ──
    if (action === 'get_platform_config') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized', error_code: 'PERMISSION_DENIED' }, { status: 401 });
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden', error_code: 'PERMISSION_DENIED' }, { status: 403 });
      }

      const stripeKey = getSecret('STRIPE_SECRET_KEY') || '';
      const environment = stripeKey.startsWith('sk_live') ? 'live' : stripeKey.startsWith('sk_test') ? 'test' : 'unconfigured';

      return Response.json({
        environment,
        xero: {
          client_id_configured: !!clientId,
          client_secret_configured: !!clientSecret,
          redirect_uri_configured: !!redirectUri,
          redirect_uri: redirectUri || '(not configured)',
          callback_health: redirectUri ? 'ok' : 'missing_redirect_uri',
          required_scopes: XERO_SCOPES.split(' '),
          oauth_ready: configured,
          sync_ready: configured,
          token_encryption_enabled: isEncryptionAvailable(),
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
          xero_oauth: '3.0',
          integration_sync: '1.0',
        },
      });
    }

    // ── ACTION: get_auth_url ──
    if (action === 'get_auth_url') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required', error_code: 'WORKSPACE_REQUIRED' }, { status: 400 });
      }

      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized', error_code: 'PERMISSION_DENIED' }, { status: 401 });

      const allowedRoles = ['admin', 'tenant_admin'];
      if (!allowedRoles.includes(user.role)) {
        return Response.json({ error: 'Forbidden', error_code: 'PERMISSION_DENIED' }, { status: 403 });
      }

      if (!configured) {
        return Response.json({
          configured: false,
          auth_url: null,
          error_code: 'CONFIGURATION_UNAVAILABLE',
          message: 'Xero integration is temporarily unavailable.',
        });
      }

      // Invalidate any existing pending transactions for this tenant+user (prevents duplicate clicks)
      const existingTxns = await base44.asServiceRole.entities.OAuthTransaction.filter({
        tenant_id,
        user_id: user.id,
        provider: 'xero',
        status: 'pending',
      });
      for (const txn of existingTxns) {
        await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, { status: 'expired' });
      }

      // Create single-use OAuth transaction
      const nonce = generateNonce();
      const nonceHash = await sha256Hash(nonce);
      const now = Date.now();
      const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.OAuthTransaction.create({
        tenant_id,
        provider: 'xero',
        nonce_hash: nonceHash,
        user_id: user.id,
        return_route: '/platform/integrations',
        status: 'pending',
        environment: getSecret('STRIPE_SECRET_KEY')?.startsWith('sk_live') ? 'live' : 'preview',
        expires_at: expiresAt,
      });

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId!,
        redirect_uri: redirectUri,
        scope: XERO_SCOPES,
        state: nonce,
      });

      return Response.json({
        configured: true,
        auth_url: `${XERO_AUTH_URL}?${params.toString()}`,
      });
    }

    // ── ACTION: get_status ──
    if (action === 'get_status') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required', error_code: 'WORKSPACE_REQUIRED' }, { status: 400 });
      }

      const statusUser = await base44.auth.me();
      if (!statusUser) return Response.json({ error: 'Unauthorized', error_code: 'PERMISSION_DENIED' }, { status: 401 });

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({
          connected: false,
          configured,
          status: configured ? 'not_connected' : 'not_configured',
          message: configured
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
        configured,
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
    if (!configured) {
      return Response.json({
        configured: false,
        error: 'Xero integration is temporarily unavailable.',
        error_code: 'CONFIGURATION_UNAVAILABLE',
      }, { status: 503 });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', error_code: 'PERMISSION_DENIED' }, { status: 401 });

    const allowedRoles = ['admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Only authorised administrators can manage Xero connections', error_code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    // ── ACTION: exchange_code ──
    if (action === 'exchange_code') {
      if (!code || !state) {
        return Response.json({ error: 'code and state are required', error_code: 'CALLBACK_FAILED' }, { status: 400 });
      }

      // Hash the nonce and look up the OAuth transaction
      const nonceHash = await sha256Hash(state);
      const transactions = await base44.asServiceRole.entities.OAuthTransaction.filter({
        nonce_hash: nonceHash,
        provider: 'xero',
      });

      if (!transactions || transactions.length === 0) {
        return Response.json({ error: 'Invalid or expired authorisation state. Please try connecting again.', error_code: 'INVALID_STATE' }, { status: 400 });
      }

      const txn = transactions[0];

      // Verify expiry
      if (txn.expires_at && new Date(txn.expires_at) < new Date()) {
        await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, { status: 'expired' });
        return Response.json({ error: 'Authorisation state has expired. Please try connecting again.', error_code: 'STATE_EXPIRED' }, { status: 400 });
      }

      // Verify not already consumed
      if (txn.status !== 'pending') {
        return Response.json({ error: 'This authorisation state has already been used. Please try connecting again.', error_code: 'STATE_ALREADY_USED' }, { status: 400 });
      }

      // Verify user ownership
      if (txn.user_id !== user.id) {
        return Response.json({ error: 'Authorisation state does not belong to this user.', error_code: 'INVALID_STATE' }, { status: 403 });
      }

      // Atomically mark as processing
      await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, { status: 'processing' });

      const resolvedTenantId = txn.tenant_id;

      // Exchange auth code for tokens (using the same canonical redirect URI)
      const tokenRes = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        console.error('[xeroOAuth] Token exchange failed:', tokenRes.status);
        await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, { status: 'failed' });
        return Response.json({
          error: 'Failed to complete Xero authorisation. Please try again.',
          error_code: 'TOKEN_EXCHANGE_FAILED',
        }, { status: 400 });
      }

      const tokens = await tokenRes.json();

      // Fetch Xero tenant connections (organisations the user authorised)
      const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      let xeroConnections: any[] = [];
      if (connectionsRes.ok) {
        xeroConnections = await connectionsRes.json();
      } else {
        console.warn('[xeroOAuth] Could not fetch Xero connections:', connectionsRes.status);
      }

      // Encrypt tokens before storage
      const encryptionCtx = `xero:${resolvedTenantId}`;
      let encAccessToken = tokens.access_token;
      let encRefreshToken = tokens.refresh_token;
      let tokenEncryptionVersion = 0;

      if (isEncryptionAvailable()) {
        encAccessToken = await encryptToken(tokens.access_token, encryptionCtx);
        encRefreshToken = await encryptToken(tokens.refresh_token, encryptionCtx);
        tokenEncryptionVersion = 1;
      } else {
        console.warn('[xeroOAuth] INTEGRATION_ENCRYPTION_KEY not configured — storing tokens as plaintext (security gap)');
      }

      // ── Multi-organisation selection ──
      if (xeroConnections.length > 1) {
        const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
          tenant_id: resolvedTenantId,
          service_type: 'xero',
        });

        const credentialData: any = {
          tenant_id: resolvedTenantId,
          service_type: 'xero',
          status: 'connected',
          access_token: encAccessToken,
          refresh_token: encRefreshToken,
          token_encryption_version: tokenEncryptionVersion,
          token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
          scopes: XERO_SCOPES.split(' '),
          connected_by_id: user.id,
          connected_by_name: user.full_name,
          connected_date: new Date().toISOString(),
          last_refreshed_date: new Date().toISOString(),
          last_error: '',
        };

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.IntegrationCredential.update(existing[0].id, credentialData);
        } else {
          await base44.asServiceRole.entities.IntegrationCredential.create(credentialData);
        }

        // Keep transaction in "processing" for select_organisation to complete
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

      const credentialData: any = {
        tenant_id: resolvedTenantId,
        service_type: 'xero',
        status: 'connected',
        access_token: encAccessToken,
        refresh_token: encRefreshToken,
        token_encryption_version: tokenEncryptionVersion,
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

      // Mark transaction as consumed
      await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, {
        status: 'consumed',
        consumed_at: new Date().toISOString(),
      });

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
    if (action === 'select_organisation') {
      if (!state || !xero_tenant_id) {
        return Response.json({ error: 'state and xero_tenant_id are required', error_code: 'CALLBACK_FAILED' }, { status: 400 });
      }

      // Validate the state against OAuthTransaction
      const nonceHash = await sha256Hash(state);
      const transactions = await base44.asServiceRole.entities.OAuthTransaction.filter({
        nonce_hash: nonceHash,
        provider: 'xero',
      });

      if (!transactions || transactions.length === 0) {
        return Response.json({ error: 'Invalid authorisation state.', error_code: 'INVALID_STATE' }, { status: 400 });
      }

      const txn = transactions[0];

      if (txn.expires_at && new Date(txn.expires_at) < new Date()) {
        return Response.json({ error: 'Authorisation state has expired.', error_code: 'STATE_EXPIRED' }, { status: 400 });
      }

      if (txn.status !== 'processing') {
        return Response.json({ error: 'Authorisation state has already been used.', error_code: 'STATE_ALREADY_USED' }, { status: 400 });
      }

      if (txn.user_id !== user.id) {
        return Response.json({ error: 'Authorisation state does not belong to this user.', error_code: 'INVALID_STATE' }, { status: 403 });
      }

      const resolvedTenantId = txn.tenant_id;

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id: resolvedTenantId,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No pending Xero connection found. Please reconnect.', error_code: 'RECONNECT_REQUIRED' }, { status: 404 });
      }

      const cred = existing[0];

      // Decrypt access token to fetch org name from Xero connections endpoint
      let accessToken = cred.access_token;
      if (cred.token_encryption_version >= 1) {
        accessToken = await decryptToken(cred.access_token, `xero:${resolvedTenantId}`);
      }

      let orgName = '';
      try {
        const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (connectionsRes.ok) {
          const conns = await connectionsRes.json();
          const selected = conns.find((c: any) => c.tenantId === xero_tenant_id);
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

      // Mark transaction as consumed
      await base44.asServiceRole.entities.OAuthTransaction.update(txn.id, {
        status: 'consumed',
        consumed_at: new Date().toISOString(),
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
        return Response.json({ error: 'tenant_id is required', error_code: 'WORKSPACE_REQUIRED' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No Xero credential found for this tenant', error_code: 'RECONNECT_REQUIRED' }, { status: 404 });
      }

      const cred = existing[0];
      if (cred.status === 'disconnected') {
        return Response.json({ error: 'Xero connection is disconnected. Please reconnect.', error_code: 'RECONNECT_REQUIRED' }, { status: 403 });
      }

      // Decrypt refresh token
      let refreshToken = cred.refresh_token;
      if (cred.token_encryption_version >= 1) {
        refreshToken = await decryptToken(cred.refresh_token, `xero:${tenant_id}`);
      }

      const tokenRes = await fetch(XERO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!tokenRes.ok) {
        console.error('[xeroOAuth] Token refresh failed:', tokenRes.status);
        await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
          status: 'expired',
          last_error: 'Token refresh failed — reconnection required.',
        });
        return Response.json({ error: 'Xero token refresh failed. Reconnection required.', error_code: 'RECONNECT_REQUIRED' }, { status: 401 });
      }

      const tokens = await tokenRes.json();
      const encryptionCtx = `xero:${tenant_id}`;

      let encAccessToken = tokens.access_token;
      let encRefreshToken = tokens.refresh_token;
      if (isEncryptionAvailable()) {
        encAccessToken = await encryptToken(tokens.access_token, encryptionCtx);
        encRefreshToken = await encryptToken(tokens.refresh_token, encryptionCtx);
      }

      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        access_token: encAccessToken,
        refresh_token: encRefreshToken,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        last_refreshed_date: new Date().toISOString(),
        status: 'connected',
        last_error: '',
      });

      return Response.json({ success: true, message: 'Xero token refreshed.' });
    }

    // ── ACTION: disconnect ──
    if (action === 'disconnect') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required', error_code: 'WORKSPACE_REQUIRED' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ error: 'No Xero connection found', error_code: 'CALLBACK_FAILED' }, { status: 404 });
      }

      const cred = existing[0];

      // Decrypt access token for revocation
      let accessToken = cred.access_token;
      if (cred.token_encryption_version >= 1) {
        accessToken = await decryptToken(cred.access_token, `xero:${tenant_id}`);
      }

      // Attempt to revoke the token at Xero (best-effort)
      try {
        await fetch(XERO_REVOCATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
          },
          body: new URLSearchParams({
            token: accessToken,
            token_type_hint: 'access_token',
          }),
        });
      } catch {
        // Best-effort revocation
      }

      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        status: 'disconnected',
        access_token: '',
        refresh_token: '',
        token_encryption_version: 0,
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

      return Response.json({ success: true, message: 'Xero disconnected. Future syncs are paused.' });
    }

    // ── ACTION: test_connection ──
    if (action === 'test_connection') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required', error_code: 'WORKSPACE_REQUIRED' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({ healthy: false, reason: 'not_connected', message: 'No Xero connection found for this tenant.' });
      }

      let cred = existing[0];
      if (cred.status === 'disconnected') {
        return Response.json({ healthy: false, reason: 'disconnected', message: 'Xero connection is disconnected. Reconnect to continue.' });
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
          return Response.json({ healthy: false, reason: 'token_refresh_failed', message: 'Xero token expired and refresh failed. Reconnection required.' });
        }
        const refreshed = await base44.asServiceRole.entities.IntegrationCredential.filter({ tenant_id, service_type: 'xero' });
        cred = refreshed[0];
      }

      // Decrypt access token for API call
      let accessToken = cred.access_token;
      if (cred.token_encryption_version >= 1) {
        accessToken = await decryptToken(cred.access_token, `xero:${tenant_id}`);
      }

      const orgRes = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-tenant-id': cred.external_tenant_id,
          'Accept': 'application/json',
        },
      });

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const orgName = orgData.Organisations?.[0]?.Name || cred.external_tenant_name || 'Xero Organisation';
        await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, { status: 'connected', last_error: '' });
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
          action_type: 'XERO_TEST_CONNECTION_OK', module: 'finance',
          target_entity: 'IntegrationCredential', target_record_id: cred.id,
          details: `Xero connection test successful. Organisation: ${orgName}.`,
          shield_outcome: 'not_evaluated', category: 'operational', event_source: 'xeroOAuth',
        });
        return Response.json({ healthy: true, reason: 'connected', organisation_name: orgName, message: 'Xero connection is healthy.' });
      }

      const errStatus = orgRes.status;
      let reason = 'api_error';
      let newStatus = 'error';
      if (errStatus === 401) { reason = 'revoked'; newStatus = 'expired'; }
      await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
        status: newStatus,
        last_error: `Connection test failed (HTTP ${errStatus}).`,
      });
      return Response.json({
        healthy: false,
        reason,
        message: errStatus === 401
          ? 'Xero access has been revoked or the token is invalid. Reconnect Xero.'
          : 'Xero API returned an error. Please try again later.',
      });
    }

    return Response.json({ error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ERROR' }, { status: 400 });

  } catch (error) {
    console.error('[xeroOAuth] Error:', error.message);
    return Response.json({ error: 'An unexpected error occurred. Please try again.', error_code: 'UNKNOWN_ERROR' }, { status: 500 });
  }
});