import fs from 'fs';
import path from 'path';

const secretCache = new Map<string, string | null>();

const normalizeValue = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readSecretFile = (filePath: string): string | undefined => {
  try {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const contents = fs.readFileSync(resolvedPath, 'utf8');
    return normalizeValue(contents);
  } catch (error) {
    console.warn(
      `AI secret file read failed for ${filePath}:`,
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
};

export const resolveSecret = (env: NodeJS.ProcessEnv, envKey: string): string | undefined => {
  if (secretCache.has(envKey)) {
    const cached = secretCache.get(envKey);
    return cached === null ? undefined : cached;
  }

  const directValue = normalizeValue(env[envKey]);
  if (directValue) {
    secretCache.set(envKey, directValue);
    return directValue;
  }

  const fileKey = `${envKey}_FILE`;
  const fileValue = normalizeValue(env[fileKey]);
  if (fileValue) {
    const resolved = readSecretFile(fileValue);
    secretCache.set(envKey, resolved ?? null);
    return resolved;
  }

  const secretsDir = normalizeValue(env.AI_SECRETS_DIR) ?? normalizeValue(env.SECRETS_DIR);
  if (secretsDir) {
    const candidate = path.join(secretsDir, envKey.toLowerCase());
    const resolved = readSecretFile(candidate);
    secretCache.set(envKey, resolved ?? null);
    return resolved;
  }

  secretCache.set(envKey, null);
  return undefined;
};

export const clearSecretCache = (): void => {
  secretCache.clear();
};
