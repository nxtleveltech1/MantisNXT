import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MANTIS_COLORS } from '@/lib/colors';

export type PlatformBranding = {
  /**
   * Data URI (e.g. data:image/svg+xml;base64,...)
   */
  logoDataUri: string;
  /**
   * Primary accent for document UI elements (rules, headers, badges).
   */
  accentHex: string;
};

let cachedBranding: PlatformBranding | null = null;

async function readPublicAssetAsDataUri(relativePublicPath: string, mimeType: string) {
  const absolute = path.join(process.cwd(), 'public', relativePublicPath);
  const buf = await readFile(absolute);
  const base64 = buf.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

export async function getPlatformBranding(): Promise<PlatformBranding> {
  if (cachedBranding) return cachedBranding;

  // Prefer the NXT logo if present (matches platform).
  const logoDataUri = await readPublicAssetAsDataUri('images/nxt-logo.svg', 'image/svg+xml');

  cachedBranding = {
    logoDataUri,
    accentHex: MANTIS_COLORS.primary,
  };

  return cachedBranding;
}


