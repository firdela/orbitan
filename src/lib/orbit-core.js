// ============================================================
// ORBIT CORE — Platform-Agnostic Data Access Layer
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY: This is the adapter bridge between OrbitanOS
// business logic and the underlying platform SDK. Today it
// delegates to Base44. Tomorrow it can delegate to Supabase,
// AWS, or a custom Node backend — by changing ONLY this file.
//
// CONSUMERS: All new modules should import from @/lib/orbit-core
// instead of @/api/base44Client directly. Existing code that
// already imports base44 continues to work — this is additive.
//
// Decision Record: ODR-0023 (Orbit Core Adapter Pattern)
// ============================================================

import { base44 } from '@/api/base44Client';

// ── Standardised Orbit-Native User Shape ────────────────────
// Maps whatever the platform returns into a stable contract
// that the rest of the app can rely on regardless of provider.
//
// If we switch auth providers, only this mapping changes.

function mapUser(rawUser) {
  if (!rawUser) return null;
  return {
    id: rawUser.id,
    email: rawUser.email,
    full_name: rawUser.full_name || rawUser.name || '',
    role: rawUser.role || 'user',
    tenant_id: rawUser.data?.tenant_id || rawUser.tenant_id || null,
    outlet_id: rawUser.data?.outlet_id || rawUser.outlet_id || null,
    company_id: rawUser.data?.company_id || rawUser.company_id || null,
    data: rawUser.data || {},
  };
}

// ── Standardised Error Shape ────────────────────────────────
// Wraps platform-specific errors into a consistent Orbit error
// so UI layers don't need to know whether it's Base44 or not.

class OrbitError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message);
    this.name = 'OrbitError';
    this.code = code || 'UNKNOWN';
    this.status = status || 500;
    this.cause = cause;
  }
}

function wrapError(err, context) {
  if (err instanceof OrbitError) return err;
  const message = err?.message || err?.toString() || 'Unknown error';
  const status = err?.response?.status || err?.status || 500;
  return new OrbitError(`${context}: ${message}`, { status, cause: err });
}

// ============================================================
// ORBIT CORE — Public Interface
// ============================================================

export const OrbitCore = {
  // ── Auth ──────────────────────────────────────────────────
  // Returns a standardised Orbit user or null.
  // Switching auth providers = change only this block.

  auth: {
    async me() {
      try {
        const raw = await base44.auth.me();
        return mapUser(raw);
      } catch (err) {
        // 401 / unauthenticated = null, not a throw
        if (err?.response?.status === 401 || err?.status === 401) return null;
        throw wrapError(err, 'OrbitCore.auth.me');
      }
    },

    async isAuthenticated() {
      try {
        return await base44.auth.isAuthenticated();
      } catch {
        return false;
      }
    },

    async updateMe(data) {
      try {
        const raw = await base44.auth.updateMe(data);
        return mapUser(raw);
      } catch (err) {
        throw wrapError(err, 'OrbitCore.auth.updateMe');
      }
    },

    async logout(redirectUrl) {
      return base44.auth.logout(redirectUrl);
    },

    async redirectToLogin(nextUrl) {
      return base44.auth.redirectToLogin(nextUrl);
    },
  },

  // ── Data (Entity Adapter) ─────────────────────────────────
  // All entity CRUD goes through here. The method signatures
  // mirror the Base44 entity API but return plain data — no
  // SDK-specific response shapes leak into business logic.
  //
  // entityName: string (e.g. 'Employee', 'InventoryItem')
  // filter: object (MongoDB-style query, same as Base44)

  data: {
    async list(entityName, sort, limit) {
      try {
        return await base44.entities[entityName].list(sort, limit);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.list(${entityName})`);
      }
    },

    async filter(entityName, filter, sort, limit) {
      try {
        return await base44.entities[entityName].filter(filter, sort, limit);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.filter(${entityName})`);
      }
    },

    async get(entityName, id) {
      try {
        return await base44.entities[entityName].get(id);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.get(${entityName})`);
      }
    },

    async create(entityName, data) {
      try {
        return await base44.entities[entityName].create(data);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.create(${entityName})`);
      }
    },

    async update(entityName, id, data) {
      try {
        return await base44.entities[entityName].update(id, data);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.update(${entityName})`);
      }
    },

    async delete(entityName, id) {
      try {
        return await base44.entities[entityName].delete(id);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.delete(${entityName})`);
      }
    },

    async bulkCreate(entityName, items) {
      try {
        return await base44.entities[entityName].bulkCreate(items);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.bulkCreate(${entityName})`);
      }
    },

    async bulkUpdate(entityName, items) {
      try {
        return await base44.entities[entityName].bulkUpdate(items);
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.bulkUpdate(${entityName})`);
      }
    },

    // Subscribe to realtime entity events.
    // Returns an unsubscribe function.
    subscribe(entityName, callback) {
      return base44.entities[entityName].subscribe(callback);
    },

    // Get the JSON schema for an entity (for dynamic forms).
    async schema(entityName) {
      try {
        return await base44.entities[entityName].schema();
      } catch (err) {
        throw wrapError(err, `OrbitCore.data.schema(${entityName})`);
      }
    },
  },

  // ── Services (Backend Function Proxy) ─────────────────────
  // Wraps base44.functions.invoke with standard error handling.
  // response.data is extracted so business logic gets clean data.

  services: {
    async invoke(functionName, payload) {
      try {
        const response = await base44.functions.invoke(functionName, payload);
        // Base44 returns an Axios-like { data, status, headers }
        if (response?.data !== undefined) return response.data;
        return response;
      } catch (err) {
        throw wrapError(err, `OrbitCore.services.invoke(${functionName})`);
      }
    },
  },

  // ── Integrations (Core Platform Services) ──────────────────
  // Wraps base44.integrations.Core.* with standard error handling.

  integrations: {
    async invokeLLM(params) {
      try {
        return await base44.integrations.Core.InvokeLLM(params);
      } catch (err) {
        throw wrapError(err, 'OrbitCore.integrations.invokeLLM');
      }
    },

    async uploadFile(file) {
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result?.file_url || result;
      } catch (err) {
        throw wrapError(err, 'OrbitCore.integrations.uploadFile');
      }
    },

    async sendEmail(params) {
      try {
        return await base44.integrations.Core.SendEmail(params);
      } catch (err) {
        throw wrapError(err, 'OrbitCore.integrations.sendEmail');
      }
    },

    async generateImage(prompt, existingImageUrls) {
      try {
        return await base44.integrations.Core.GenerateImage({
          prompt,
          existing_image_urls: existingImageUrls,
        });
      } catch (err) {
        throw wrapError(err, 'OrbitCore.integrations.generateImage');
      }
    },
  },

  // ── Users (Admin Operations) ───────────────────────────────
  users: {
    async inviteUser(email, role) {
      try {
        return await base44.users.inviteUser(email, role);
      } catch (err) {
        throw wrapError(err, 'OrbitCore.users.inviteUser');
      }
    },
  },

  // ── Analytics ──────────────────────────────────────────────
  analytics: {
    track(event) {
      try {
        return base44.analytics.track(event);
      } catch {
        // Analytics failures should never break the app
      }
    },
  },
};

// ── Exports ─────────────────────────────────────────────────
export { OrbitError };
export default OrbitCore;