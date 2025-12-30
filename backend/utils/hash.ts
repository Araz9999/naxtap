/**
 * Password hashing helpers (test-friendly wrapper).
 *
 * Note: The project uses PBKDF2 via WebCrypto (see `backend/utils/password.ts`).
 * This file exposes `hashPassword` / `comparePassword` with a stable API.
 */

export { hashPassword } from './password';

function isValidHex(s: string): boolean {
  return typeof s === 'string' && s.length > 0 && s.length % 2 === 0 && /^[0-9a-f]+$/i.test(s);
}

/**
 * Timing-safe comparison for hex strings.
 * Falls back to a constant-time JS loop if Node crypto is unavailable.
 */
function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  if (!isValidHex(aHex) || !isValidHex(bHex)) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { timingSafeEqual } = require('crypto') as typeof import('crypto');
    return timingSafeEqual(Buffer.from(aHex, 'hex'), Buffer.from(bHex, 'hex'));
  } catch {
    // Constant-time-ish fallback (prevents early-exit comparisons)
    let result = 0;
    for (let i = 0; i < aHex.length; i++) {
      result |= aHex.charCodeAt(i) ^ bHex.charCodeAt(i);
    }
    return result === 0;
  }
}

export async function comparePassword(password: string, stored: string): Promise<boolean> {
  try {
    if (typeof stored !== 'string' || stored.length === 0) return false;

    // Legacy support: old hashes stored as plain SHA-256 hex (no salt separator)
    if (!stored.includes(':')) {
      if (!isValidHex(stored)) return false;
      const data = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const computed = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return timingSafeEqualHex(computed, stored.toLowerCase());
    }

    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    if (!isValidHex(saltHex) || !isValidHex(hashHex)) return false;

    const saltPairs = saltHex.match(/.{2}/g) || [];
    const saltBytes = new Uint8Array(saltPairs.map((b) => parseInt(b, 16)));
    if (saltBytes.length !== 16) return false;

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256,
    );

    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return timingSafeEqualHex(computedHash, hashHex.toLowerCase());
  } catch {
    return false;
  }
}

