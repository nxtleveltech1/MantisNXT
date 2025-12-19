import crypto from 'crypto';

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const keyMaterial = process.env.DARTAI_TOKEN_ENCRYPTION_KEY;
  if (!keyMaterial) {
    // Avoid logging secrets; keep message actionable.
    throw new Error('DARTAI_TOKEN_ENCRYPTION_KEY is not set');
  }

  const salt = process.env.DARTAI_TOKEN_ENCRYPTION_SALT || 'mantisnxt-dartai-token-v1';

  // PBKDF2 keeps key derivation stable across deploys (keyMaterial itself is treated as secret).
  return crypto.pbkdf2Sync(keyMaterial, salt, 100000, KEY_LENGTH, 'sha256');
}

export function encryptDartAiToken(plaintext: string): string {
  if (!plaintext) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store as base64(iv || tag || ciphertext)
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptDartAiToken(encrypted: string): string {
  if (!encrypted) return '';

  const combined = Buffer.from(encrypted, 'base64');
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted token payload');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}






