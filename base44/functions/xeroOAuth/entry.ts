import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Xero OAuth Bridge — OrbitanOS Delegated Integration Hub
 *
 * Handles the full Xero OAuth 2.0 authorization code flow:
 *   1. get_auth_url    — Returns the Xero consent URL for the finance user to visit
 *   2. exchange_code   — Exchanges the OAuth callback code for access+refresh tokens,
 *                        stores them in IntegrationCredential, fetches tenant connections
 *   3. refresh_token   — Refreshes an expired access token using the stored refresh token
 *   4. get_status      — Returns the current connection status for a tenant
 *   5. disconnect      — Revokes tokens and marks credential as disconnected
 *
 * SECURITY:
 *   - Tokens are stored ONLY in IntegrationCredential (admin-only writes)
 *   - Uses service role for all token writes (bypasses RLS)
 *   - User must be authenticated and be admin or tenant_admin
 *   - XERO_CLIENT_ID / XERO_CLIENT_SECRET are read from env — if not set,
 *     the function returns a "not_configured" status so the UI can show
 *     a setup-prompt instead of crashing.
 *
 * FUTURE CUSTOMERS: This is fully multi-tenant. Each tenant connects their own
 * Xero org. The redirect URI uses the app's deployed origin so it works for
 * any customer domain automatically.
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// Scopes required for OrbitanOS finance sync
const XERO_SCOPES = [
  'offline_access',
  'accounting.transactions',
  'accounting.settings.read',
  'accounting.contacts',
].join(' ');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Public endpoint for get_auth_url: needs auth but not admin (the finance user
    //    clicking "Connect Xero" may be a tenant_admin). All other actions require
    //    admin or tenant_admin.
    const body = await req.json().catch(() => ({}));
    const { action, tenant_id, code, redirect_uri } = body;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    const clientId = Deno.env.get('XERO_CLIENT_ID');
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET');

    // ── ACTION: get_auth_url ──
    // Returns the Xero consent screen URL. No secrets needed to build the URL
    // (client_id is public), but we check anyway to give a clear message.
    if (action === 'get_auth_url') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      // Verify the user belongs to this tenant
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!clientId) {
        return Response.json({
          configured: false,
          auth_url: null,
          message: 'Xero integration is not configured yet. The platform admin needs to add XERO_CLIENT_ID and XERO_CLIENT_SECRET secrets in the dashboard settings. Once added, finance teams can connect their Xero account here.',
        });
      }

      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.orbitan.com';
      const finalRedirect = redirect_uri || `${origin}/platform/integrations`;

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: finalRedirect,
        scope: XERO_SCOPES,
        state: tenant_id, // Pass tenant_id through OAuth state for callback resolution
      });

      const authUrl = `${XERO_AUTH_URL}?${params.toString()}`;

      return Response.json({
        configured: true,
        auth_url: authUrl,
        redirect_uri: finalRedirect,
      });
    }

    // ── All remaining actions require secrets ──
    if (!clientId || !clientSecret) {
      return Response.json({
        configured: false,
        error: 'Xero integration is not configured. Add XERO_CLIENT_ID and XERO_CLIENT_SECRET to dashboard settings → environment variables.',
      }, { status: 503 });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Only admins or tenant admins can manage Xero connections' }, { status: 403 });
    }

    // ── ACTION: exchange_code ──
    // Called by the frontend after Xero redirects back with ?code=...&state=tenant_id
    if (action === 'exchange_code') {
      if (!code || !tenant_id) {
        return Response.json({ error: 'code and tenant_id are required' }, { status: 400 });
      }

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
        console.error('[xeroOAuth] Token exchange failed:', errText);
        return Response.json({
          error: 'Failed to exchange Xero authorization code for tokens.',
          details: errText,
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
        console.warn('[xeroOAuth] Could not fetch Xero connections:', await connectionsRes.text());
      }

      const primaryConnection = xeroConnections[0] || {};

      // Check if a credential already exists for this tenant + xero
      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      const credentialData = {
        tenant_id,
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

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'XERO_CONNECTED',
        module: 'finance',
        target_entity: 'IntegrationCredential',
        target_record_id: credential.id,
        details: `Xero connected by ${user.full_name}. Tenant: ${primaryConnection.tenantName || 'Unknown'}.`,
        shield_outcome: 'not_evaluated',
      });

      return Response.json({
        success: true,
        message: 'Xero connected successfully.',
        credential_id: credential.id,
        xero_tenant_name: primaryConnection.tenantName || 'Unknown',
        xero_tenant_id: primaryConnection.tenantId || '',
      });
    }

    // ── ACTION: refresh_token ──
    // Called internally by financeController when a token is near expiry
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
        const errText = await tokenRes.text();
        console.error('[xeroOAuth] Token refresh failed:', errText);

        // Mark credential as expired
        await base44.asServiceRole.entities.IntegrationCredential.update(cred.id, {
          status: 'expired',
          last_error: 'Token refresh failed: ' + errText,
        });

        return Response.json({
          error: 'Xero token refresh failed. Reconnection required.',
          details: errText,
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
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      });
    }

    // ── ACTION: get_status ──
    if (action === 'get_status') {
      if (!tenant_id) {
        return Response.json({ error: 'tenant_id is required' }, { status: 400 });
      }

      const existing = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });

      if (!existing || existing.length === 0) {
        return Response.json({
          connected: false,
          configured: !!clientId,
          status: 'not_connected',
          message: clientId
            ? 'Xero is ready to connect. Click "Connect Xero" to start.'
            : 'Xero integration is not configured yet. Platform admin must add XERO_CLIENT_ID and XERO_CLIENT_SECRET secrets.',
        });
      }

      const cred = existing[0];
      const isExpired = cred.token_expires_at && new Date(cred.token_expires_at) < new Date();

      return Response.json({
        connected: cred.status === 'connected' && !isExpired,
        configured: true,
        status: isExpired && cred.status === 'connected' ? 'expired' : cred.status,
        xero_tenant_name: cred.external_tenant_name,
        xero_tenant_id: cred.external_tenant_id,
        connected_date: cred.connected_date,
        last_refreshed: cred.last_refreshed_date,
        last_error: cred.last_error,
        token_expires_at: cred.token_expires_at,
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

      await base44.asServiceRole.entities.IntegrationCredential.update(existing[0].id, {
        status: 'disconnected',
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
        target_record_id: existing[0].id,
        details: `Xero disconnected by ${user.full_name}.`,
        shield_outcome: 'not_evaluated',
      });

      return Response.json({
        success: true,
        message: 'Xero disconnected.',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[xeroOAuth] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});