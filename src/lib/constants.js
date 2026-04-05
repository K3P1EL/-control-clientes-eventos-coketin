// Centralized business rules and limits
export const LIMITS = {
  TIPO_CHANGES_PER_HOUR: 3,
  DELETES_PER_DAY: 5,
  RESTORES_PER_DAY: 5,
  STORAGE_BUCKET_BYTES: 1 * 1024 * 1024 * 1024, // 1GB free tier
  STORAGE_LIST_LIMIT: 1000,
  OCR_FREE_TIER: 1000,
}
