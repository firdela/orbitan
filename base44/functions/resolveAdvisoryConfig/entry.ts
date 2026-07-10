// ============================================================
// ORBITAN — resolveAdvisoryConfig Backend Function
// Registry-Driven Advisory Config Resolver
//
// Serves advisory rules (recommended_path, critical_modules,
// advisory rules, module_recommendations) from the
// ActivationRegistry entity — replacing hardcoded
// INDUSTRY_ADVISORY_RULES in blueprint-registry.js.
//
// The frontend BlueprintAdvisor fetches from this endpoint.
// If no registry record has advisory_config, the frontend
// falls back to the static blueprint-registry.js data.
//
// Exit-Ready: pure query + return. Portable to any stack.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Advisory config is public — no auth required.
    // It's industry metadata, not tenant data.
    const body = await req.json().catch(() => ({}));
    const { pack_key, industry } = body;

    if (!pack_key && !industry) {
      return Response.json(
        { error: "pack_key or industry is required" },
        { status: 400 }
      );
    }

    // Query by pack_key first (more specific), then industry
    const query = pack_key ? { pack_key, is_active: true } : { industry, is_active: true };
    const registries = await base44.asServiceRole.entities.ActivationRegistry.filter(query);

    if (registries.length === 0) {
      return Response.json({
        found: false,
        advisory_config: null,
        pack_key: null,
        message: "No active ActivationRegistry record found for the given query.",
      });
    }

    const pack = registries[0];
    const advisoryConfig = pack.advisory_config || null;

    return Response.json({
      found: !!advisoryConfig,
      pack_key: pack.pack_key,
      pack_name: pack.pack_name,
      industry: pack.industry,
      governance_domain: pack.governance_domain,
      advisory_config: advisoryConfig,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});