// @ts-nocheck
import NodeCache from 'node-cache'

const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10)
const checkPeriod = Math.max(30, Math.floor(ttlSeconds / 2))

let singleton: NodeCache | null = null

function getCache(): NodeCache {
  if (!singleton) {
    singleton = new NodeCache({ stdTTL: ttlSeconds, checkperiod: checkPeriod, useClones: false })
  }
  return singleton
}

export async function getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
  const cache = getCache()
  const existing = cache.get<T>(key)
  if (existing !== undefined) return existing
  const data = await fetcher()
  cache.set(key, data, ttl)
  return data
}

export function makeKey(url: string, extras?: Record<string, unknown>): string {
  const base = url
  const extra = extras ? '|' + JSON.stringify(extras) : ''
  return `resp:${base}${extra}`
}

export function del(key: string) {
  getCache().del(key)
}

