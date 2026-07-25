// Data Migration Engine — bulk import with validation, duplicate detection, preview, commit, rollback (Build #17).
// Supports InventoryItem, Supplier, Recipe, Employee, CustomerProfile.
// CSV parsed deterministically (free, fast); Excel/other formats via ExtractDataFromUploadedFile integration.
// Admin: any tenant. tenant_admin: own tenant only. All writes via asServiceRole with explicit tenant_id.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TARGETS = {
  InventoryItem: {
    label: 'Inventory Items',
    fields: [
      { key: 'name', type: 'string', required: true, desc: 'Item name e.g. Tortilla Flour' },
      { key: 'unit', type: 'string', required: true, desc: 'Unit e.g. kg, litre, piece' },
      { key: 'sku', type: 'string' },
      { key: 'category', type: 'string' },
      { key: 'current_stock', type: 'number', desc: 'Current stock quantity' },
      { key: 'par_level', type: 'number' },
      { key: 'reorder_point', type: 'number' },
      { key: 'cost_per_unit', type: 'number', desc: 'Cost per unit in SGD' },
      { key: 'storage_location', type: 'string' },
      { key: 'notes', type: 'string' },
    ],
    duplicateKeys: ['name'],
    requiresOutlet: true,
    defaults: { status: 'active', is_ingredient: true },
  },
  Supplier: {
    label: 'Suppliers',
    fields: [
      { key: 'name', type: 'string', required: true },
      { key: 'contact_person', type: 'string' },
      { key: 'email', type: 'string' },
      { key: 'phone', type: 'string' },
      { key: 'payment_terms', type: 'string', desc: 'e.g. Net 30, COD' },
      { key: 'lead_time_days', type: 'number' },
      { key: 'categories', type: 'string', desc: 'Comma-separated categories' },
      { key: 'notes', type: 'string' },
    ],
    duplicateKeys: ['name'],
    requiresOutlet: false,
    defaults: { status: 'active' },
  },
  Recipe: {
    label: 'Recipes / Menu Items',
    fields: [
      { key: 'menu_item_name', type: 'string', required: true },
      { key: 'category', type: 'string', desc: 'main, side, beverage, dessert, combo, other' },
      { key: 'selling_price', type: 'number' },
      { key: 'total_cogs', type: 'number', desc: 'Total cost per unit (SGD)' },
      { key: 'yield_unit', type: 'string', desc: 'e.g. servings, pcs' },
      { key: 'description', type: 'string' },
    ],
    duplicateKeys: ['menu_item_name'],
    requiresOutlet: false,
    defaults: { intellectual_property_level: 'standard', is_active: true, status: 'approved' },
  },
  Employee: {
    label: 'Employees',
    fields: [
      { key: 'full_name', type: 'string', required: true },
      { key: 'email', type: 'string' },
      { key: 'role', type: 'string', desc: 'tenant_admin, outlet_manager, supervisor, worker' },
      { key: 'position', type: 'string' },
      { key: 'phone', type: 'string' },
      { key: 'employment_type', type: 'string', desc: 'full_time, part_time, contract, temporary' },
      { key: 'department', type: 'string' },
    ],
    duplicateKeys: ['email'],
    requiresOutlet: false,
    defaults: { status: 'active', employment_type: 'full_time', role: 'worker' },
  },
  CustomerProfile: {
    label: 'Customers',
    fields: [
      { key: 'full_name', type: 'string', required: true },
      { key: 'email', type: 'string' },
      { key: 'phone', type: 'string' },
      { key: 'address', type: 'string' },
      { key: 'notes', type: 'string' },
    ],
    duplicateKeys: ['email'],
    requiresOutlet: false,
    defaults: { status: 'active' },
  },
};

function buildSchema(entityName) {
  const t = TARGETS[entityName];
  const props = {};
  for (const f of t.fields) {
    props[f.key] = f.type === 'number' ? { type: 'number' } : { type: 'string' };
    if (f.desc) props[f.key].description = f.desc;
  }
  return { type: 'object', properties: props };
}

function coerce(row, fields) {
  const out = {};
  for (const f of fields) {
    let v = row[f.key];
    if (v === undefined || v === null || v === '') { out[f.key] = undefined; continue; }
    if (f.type === 'number') {
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
      out[f.key] = isNaN(n) ? undefined : n;
    } else {
      out[f.key] = String(v).trim();
    }
  }
  return out;
}

function validateRow(c, fields) {
  const errors = [];
  for (const f of fields) {
    if (f.required && (c[f.key] === undefined || c[f.key] === '')) errors.push(`Missing: ${f.key}`);
  }
  return errors;
}

function dupKey(c, keys) {
  return keys.map(k => (c[k] === undefined ? '' : String(c[k])).trim()).join('|').toLowerCase();
}

// Deterministic CSV parser (handles quoted fields + embedded commas)
function splitCSVLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = cells[j] !== undefined ? cells[j] : ''; });
    // also map original-case keys for flexibility
    headers.forEach((h, j) => { const orig = splitCSVLine(lines[0])[j] ? splitCSVLine(lines[0])[j].trim() : h; row[orig] = cells[j] !== undefined ? cells[j] : ''; });
    rows.push(row);
  }
  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.role !== 'tenant_admin') return Response.json({ error: 'Forbidden — admin/tenant_admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const E = base44.asServiceRole.entities;
    const tenantId = action === 'templates' ? null : (isAdmin ? (body.tenant_id || user.data?.tenant_id) : (user.data?.tenant_id || user.tenant_id));
    if (action !== 'templates' && !tenantId) return Response.json({ error: 'tenant_id required' }, { status: 400 });
    const outletId = body.outlet_id || (user.data?.outlet_id) || null;

    // ── templates ─────────────────────────────────────────────────────────
    if (action === 'templates') {
      const out = {};
      for (const [name, t] of Object.entries(TARGETS)) {
        out[name] = {
          label: t.label,
          fields: t.fields.map(f => ({ key: f.key, required: !!f.required, type: f.type, desc: f.desc || '' })),
          csv_header: t.fields.map(f => f.key).join(','),
        };
      }
      return Response.json({ templates: out });
    }

    const entityName = body.entity_name;
    if (['preview', 'commit'].includes(action) && !TARGETS[entityName]) return Response.json({ error: `Unsupported entity: ${entityName}` }, { status: 400 });
    const target = entityName ? TARGETS[entityName] : null;

    async function extractRows(fileUrl) {
      // Deterministic CSV path (free, fast, reliable)
      if (/\.csv$/i.test(fileUrl) || /^data:text\/csv/i.test(fileUrl)) {
        try {
          const resp = await fetch(fileUrl);
          if (resp.ok) {
            const text = await resp.text();
            return parseCSV(text).slice(0, 500);
          }
        } catch (e) { /* fall through to integration */ }
      }
      // Excel / other formats — ExtractDataFromUploadedFile integration (LLM-backed)
      const schema = buildSchema(entityName);
      const res = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: schema });
      let rows = res?.output || res?.rows || res;
      if (!Array.isArray(rows)) rows = rows?.rows || [];
      return rows.slice(0, 500);
    }

    async function existingKeys() {
      const existing = await E[entityName].filter({ tenant_id: tenantId }, '-created_date', 500).catch(() => []);
      const set = new Set();
      for (const r of existing) {
        const dk = dupKey(r, target.duplicateKeys);
        if (dk && dk.replace(/\|/g, '') !== '') set.add(dk);
      }
      return set;
    }

    function process(rows, existingSet) {
      const valid = [], invalid = [], duplicates = [];
      const seenInBatch = new Set();
      rows.forEach((raw, i) => {
        const c = coerce(raw, target.fields);
        const errs = validateRow(c, target.fields);
        const dk = dupKey(c, target.duplicateKeys);
        if (errs.length > 0) { invalid.push({ row: i + 2, errors: errs, data: raw }); return; }
        const isDup = dk && dk.replace(/\|/g, '') !== '' && (existingSet.has(dk) || seenInBatch.has(dk));
        if (isDup) { duplicates.push({ row: i + 2, key: dk, data: raw }); }
        else { valid.push(c); seenInBatch.add(dk); }
      });
      return { valid, invalid, duplicates };
    }

    // ── preview ───────────────────────────────────────────────────────────
    if (action === 'preview') {
      const fileUrl = body.file_url;
      if (!fileUrl) return Response.json({ error: 'file_url required' }, { status: 400 });
      const rows = await extractRows(fileUrl);
      const existingSet = await existingKeys();
      const { valid, invalid, duplicates } = process(rows, existingSet);
      return Response.json({
        entity_name: entityName, total: rows.length, valid: valid.length,
        invalid: invalid.length, duplicate: duplicates.length,
        sample: valid.slice(0, 10), errors: invalid.slice(0, 20), duplicate_sample: duplicates.slice(0, 5),
      });
    }

    // ── commit ────────────────────────────────────────────────────────────
    if (action === 'commit') {
      const fileUrl = body.file_url;
      if (!fileUrl) return Response.json({ error: 'file_url required' }, { status: 400 });
      if (target.requiresOutlet && !outletId) return Response.json({ error: `outlet_id required for ${entityName}` }, { status: 400 });
      const fileName = body.file_name || 'upload';
      const rows = await extractRows(fileUrl);
      const existingSet = await existingKeys();
      const { valid, invalid, duplicates } = process(rows, existingSet);
      const records = valid.map(v => ({
        ...target.defaults, ...v, tenant_id: tenantId,
        ...(target.requiresOutlet ? { outlet_id: outletId } : {}),
      }));
      let createdIds = [], failed = 0;
      try {
        if (records.length > 0) {
          const created = await E[entityName].bulkCreate(records);
          createdIds = (created || []).map(r => r.id).filter(Boolean);
        }
      } catch (e) { failed = records.length; }
      const importRec = await E.ImportHistory.create({
        tenant_id: tenantId, outlet_id: outletId || null, entity_name: entityName,
        file_name: fileName, file_url: fileUrl, status: createdIds.length > 0 ? 'committed' : (records.length === 0 ? 'previewed' : 'failed'),
        total_rows: rows.length, valid_rows: valid.length, invalid_rows: invalid.length, duplicate_rows: duplicates.length,
        created_count: createdIds.length, failed_count: failed,
        created_record_ids: createdIds, field_mapping: {}, error_summary: failed > 0 ? 'bulkCreate failed' : '',
        imported_by: user.id, imported_by_name: user.full_name || user.email,
        committed_at: createdIds.length > 0 ? new Date().toISOString() : null,
      });
      await E.AuditLog.create({
        tenant_id: tenantId, actor_id: user.id, actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: 'data_import_committed', module: 'system', target_entity: entityName, target_record_id: importRec.id,
        details: `Imported ${createdIds.length} ${entityName} — ${duplicates.length} duplicates skipped, ${invalid.length} invalid`,
      }).catch(() => null);
      return Response.json({
        success: true, import_id: importRec.id, total: rows.length, created: createdIds.length,
        failed, duplicates: duplicates.length, invalid: invalid.length, errors: invalid.slice(0, 10),
      });
    }

    // ── rollback ──────────────────────────────────────────────────────────
    if (action === 'rollback') {
      const importId = body.import_id;
      if (!importId) return Response.json({ error: 'import_id required' }, { status: 400 });
      const rec = await E.ImportHistory.get(importId).catch(() => null);
      if (!rec) return Response.json({ error: 'Import not found' }, { status: 404 });
      if (!isAdmin && rec.tenant_id !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (rec.status !== 'committed') return Response.json({ error: `Import is ${rec.status} — only committed imports can be rolled back` }, { status: 400 });
      const ids = rec.created_record_ids || [];
      if (ids.length > 0) {
        try { await E[rec.entity_name].deleteMany({ id: { $in: ids } }); } catch (e) { /* best-effort */ }
      }
      await E.ImportHistory.update(importId, { status: 'rolled_back', rolled_back_at: new Date().toISOString(), rollback_reason: body.reason || 'Manual rollback' });
      await E.AuditLog.create({
        tenant_id: rec.tenant_id, actor_id: user.id, actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: 'data_import_rolled_back', module: 'system', target_entity: rec.entity_name, target_record_id: importId,
        details: `Rolled back import of ${ids.length} ${rec.entity_name}`,
      }).catch(() => null);
      return Response.json({ success: true, rolled_back: ids.length });
    }

    // ── history ───────────────────────────────────────────────────────────
    if (action === 'history') {
      const filter = body.entity_name ? { tenant_id: tenantId, entity_name: body.entity_name } : { tenant_id: tenantId };
      const records = await E.ImportHistory.filter(filter, '-created_date', 50).catch(() => []);
      return Response.json({
        history: records.map(r => ({
          id: r.id, entity_name: r.entity_name, file_name: r.file_name, status: r.status,
          total_rows: r.total_rows, created_count: r.created_count, duplicate_rows: r.duplicate_rows,
          committed_at: r.committed_at, rolled_back_at: r.rolled_back_at, created_date: r.created_date,
        })),
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[dataMigration] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});