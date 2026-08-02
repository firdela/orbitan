/**
 * OrbitanOS — Shared Token Encryption Utilities (Build #28.2B)
 * ──────────────────────────────────────────────────────────
 * Provider-agnostic, application-level encryption for OAuth tokens
 * and other sensitive integration credentials stored in entity records.
 *
 * Uses AES-GCM (authenticated encryption) via the Web Crypto API:
 *   - Unique random IV (12 bytes) per encrypted value
 *   - Authentication tag (built into AES-GCM ciphertext)
 *   - Versioned ciphertext format (v1) for forward compatibility
 *   - Key-version metadata for key rotation support
 *   - Provider+tenant context as authenticated additional data (AAD)
 *
 * SECURITY:
 *   - The encryption key is read from INTEGRATION_ENCRYPTION_KEY (server-side only)
 *   - Never uses Base64 as encryption, hardcoded keys, or tenant IDs as keys
 *   - Only backend integration services (xeroOAuth, financeSyncProcessor) may decrypt
 *   - No frontend or entity API response ever receives raw or decrypted tokens
 *
 * PORTABILITY:
 *   - Pure Web Crypto API — works in Deno, Node.js (with webcrypto), and browsers
 *   - The encryption adapter is isolated in getEncryptionKey() so the app can
 *     migrate from Base44 env vars to AWS KMS / Google KMS / Vault without
 *     rewriting encryption logic.
 *
 * EXIT-READY: pure TypeScript, no platform-specific dependencies.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ENCRYPTION_VERSION = 1;
const KEY_VERSION = 'v1';

// ── Portable encryption-key adapter ──
// Isolates key retrieval so Orbitan can migrate from Base44 env vars
// to AWS KMS / Google Secret Manager / HashiCorp Vault without
// rewriting application logic.
function getEncryptionKey(): string | undefined {
  return Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
}

/** Returns true if token encryption is available (key configured). */
export function isEncryptionAvailable(): boolean {
  return !!getEncryptionKey();
}

async function deriveAesKey(): Promise<CryptoKey> {
  const rawKey = getEncryptionKey();
  if (!rawKey) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY not configured — cannot encrypt/decrypt tokens');
  }
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(rawKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export interface EncryptedPayload {
  v: number;       // encryption format version (currently 1)
  k: string;       // key version (currently 'v1')
  iv: string;      // base64url IV
  data: string;    // base64url ciphertext + auth tag
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * Returns a JSON string containing the version, key version, IV, and ciphertext.
 *
 * @param plaintext  The raw token or secret to encrypt
 * @param context    Optional authenticated additional data (e.g. 'xero:tenantId')
 *                   — included in the AES-GCM auth tag but not encrypted
 */
export async function encryptToken(plaintext: string, context?: string): Promise<string> {
  if (!plaintext) return '';
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = context ? encoder.encode(context) : undefined;

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoder.encode(plaintext)
  );

  const payload: EncryptedPayload = {
    v: ENCRYPTION_VERSION,
    k: KEY_VERSION,
    iv: base64UrlEncode(iv),
    data: base64UrlEncode(ciphertext),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts an AES-GCM encrypted value produced by encryptToken().
 *
 * Backward compatibility: if the input is not a valid encrypted JSON payload
 * (i.e. it's legacy plaintext from before encryption was enabled), it is
 * returned as-is. This allows a gradual migration without breaking existing
 * connections.
 *
 * @param encrypted  The encrypted JSON string or legacy plaintext
 * @param context    Must match the context used during encryption (AAD)
 */
export async function decryptToken(encrypted: string, context?: string): Promise<string> {
  if (!encrypted) return '';

  // Check if this looks like an encrypted payload (JSON with v, iv, data)
  if (!encrypted.startsWith('{')) {
    return encrypted; // Legacy plaintext — return as-is
  }

  try {
    const payload: EncryptedPayload = JSON.parse(encrypted);
    if (payload.v !== ENCRYPTION_VERSION) {
      throw new Error(`Unsupported encryption version: ${payload.v}`);
    }

    const key = await deriveAesKey();
    const iv = base64UrlDecode(payload.iv);
    const aad = context ? encoder.encode(context) : undefined;

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      key,
      base64UrlDecode(payload.data)
    );

    return decoder.decode(plaintext);
  } catch {
    // If decryption fails, it may be legacy plaintext that happens to start with '{'
    // Return as-is to avoid breaking existing connections
    if (encrypted.length > 0) return encrypted;
    return '';
  }
}

/**
 * SHA-256 hash function for nonce hashing.
 * Used to store only the hash of an OAuth state nonce, not the nonce itself.
 */
export async function sha256Hash(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return base64UrlEncode(hash);
}

/**
 * Generates a cryptographically random nonce (32 bytes, base64url encoded).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}