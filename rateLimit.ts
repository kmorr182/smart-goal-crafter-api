interface Bucket {
  count: number
  resetAt: number // timestamp (ms) when this window ends
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

/** Fixed-window limiter: each key gets `max` requests per `windowMs`, held in memory. */
export function createRateLimiter(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>()

  // Forget expired windows so the Map doesn't grow forever. 
  // unref() means this timer alone won't keep the process running.
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key)
    }
  }, options.windowMs).unref()

  return function check(key: string): RateLimitResult {
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs })
      return { allowed: true }
    }
    if (bucket.count >= options.max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
    }
    bucket.count++
    return { allowed: true }
  }
}