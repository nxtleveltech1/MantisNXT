export function normalizeTextOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function resolveInventoryName(
  supplierName: string | null | undefined,
  supplierSku: string | null | undefined
): string {
  return normalizeTextOrNull(supplierName) ?? normalizeTextOrNull(supplierSku) ?? '';
}

export function resolveInventoryDescription(
  attrsDescription: string | null | undefined,
  supplierName: string | null | undefined
): string | null {
  return normalizeTextOrNull(attrsDescription) ?? normalizeTextOrNull(supplierName);
}
