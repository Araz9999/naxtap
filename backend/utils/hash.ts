/**
 * Password hashing helpers (test-friendly wrapper).
 *
 * Note: The project uses PBKDF2 via WebCrypto (see `backend/utils/password.ts`).
 * This file exposes `hashPassword` / `comparePassword` with a stable API.
 */

export { hashPassword } from './password';

export async function comparePassword(password: string, stored: string): Promise<boolean> {
  try {
    if (typeof stored !== 'string' || !stored.includes(':')) return false;
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;

    const encoder = new TextEncoder();
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);
    if (saltBytes.length !== 16) return false;

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

    return computedHash === hashHex;
  } catch {
    return false;
  }
}

