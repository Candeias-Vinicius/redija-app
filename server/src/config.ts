function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MB = 1024 * 1024;

export const config = {
  port: intFromEnv('PORT', 8080),
  /** Origens liberadas no CORS, separadas por vírgula. Vazio = só localhost (dev). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  pandocBin: process.env.PANDOC_BIN ?? 'pandoc',
  maxUploadBytes: intFromEnv('MAX_UPLOAD_MB', 150) * MB,
  maxUnzippedBytes: intFromEnv('MAX_UNZIPPED_MB', 400) * MB,
  maxZipEntries: intFromEnv('MAX_ZIP_ENTRIES', 3000),
  maxImageBytes: intFromEnv('MAX_IMAGE_MB', 30) * MB,
  maxTotalMediaBytes: intFromEnv('MAX_TOTAL_MEDIA_MB', 150) * MB,
  maxSourceEchoBytes: 2 * MB,
  pandocTimeoutMs: intFromEnv('PANDOC_TIMEOUT_MS', 90_000),
  pandocMaxHeap: process.env.PANDOC_MAX_HEAP ?? '768m',
  maxConcurrentJobs: intFromEnv('MAX_CONCURRENT_JOBS', 2),
  rateLimitPerMinute: intFromEnv('RATE_LIMIT_PER_MINUTE', 12),
} as const;
