// query-cache.ts
// Cache em memória para queries do Supabase

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  size(): number {
    return this.cache.size
  }
}

export const queryCache = new QueryCache()

export const CACHE_CONFIG = {
  TTL: CACHE_TTL,
  DEFAULT_STALE_TIME: 60 * 1000, // 1 minuto para React Query
}