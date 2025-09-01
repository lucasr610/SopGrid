import { db } from '../db';
import { systemCache } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
  type: string;
}

export class CacheManager {
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly DEFAULT_TTL = 300000; // 5 minutes default

  constructor() {
    // Clean up expired cache entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60000);
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Get from cache (memory first, then database)
  async get<T>(options: CacheOptions): Promise<T | null> {
    const memKey = `${options.type}:${options.key}`;
    
    // Check memory cache first
    const memData = this.memoryCache.get(memKey);
    if (memData && memData.expiry > Date.now()) {
      console.log(`📦 Cache hit (memory): ${memKey}`);
      return memData.data as T;
    }

    // Check database cache
    try {
      const dbData = await db.select()
        .from(systemCache)
        .where(
          and(
            eq(systemCache.cacheType, options.type),
            eq(systemCache.cacheKey, options.key)
          )
        )
        .limit(1);

      if (dbData.length > 0) {
        const cacheEntry = dbData[0];
        const age = Date.now() - new Date(cacheEntry.createdAt!).getTime();
        const ttl = options.ttl || this.DEFAULT_TTL;

        if (age < ttl) {
          console.log(`📦 Cache hit (database): ${memKey}`);
          // Store in memory cache for faster access
          this.memoryCache.set(memKey, {
            data: cacheEntry.cacheData,
            expiry: Date.now() + ttl
          });
          return cacheEntry.cacheData as T;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    console.log(`📦 Cache miss: ${memKey}`);
    return null;
  }

  // Set cache (both memory and database)
  async set<T>(options: CacheOptions, data: T): Promise<void> {
    const memKey = `${options.type}:${options.key}`;
    const ttl = options.ttl || this.DEFAULT_TTL;

    // Set in memory cache
    this.memoryCache.set(memKey, {
      data,
      expiry: Date.now() + ttl
    });

    // Set in database cache
    try {
      // First, try to delete existing entry
      await db.delete(systemCache)
        .where(
          and(
            eq(systemCache.cacheType, options.type),
            eq(systemCache.cacheKey, options.key)
          )
        );

      // Then insert new entry
      await db.insert(systemCache).values({
        cacheType: options.type,
        cacheKey: options.key,
        cacheData: data as any
      });

      console.log(`📦 Cache set: ${memKey}`);
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  // Invalidate cache
  async invalidate(type: string, key?: string): Promise<void> {
    if (key) {
      const memKey = `${type}:${key}`;
      this.memoryCache.delete(memKey);
      
      try {
        await db.delete(systemCache)
          .where(
            and(
              eq(systemCache.cacheType, type),
              eq(systemCache.cacheKey, key)
            )
          );
        console.log(`📦 Cache invalidated: ${memKey}`);
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    } else {
      // Invalidate all cache of this type
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${type}:`)) {
          this.memoryCache.delete(key);
        }
      }

      try {
        await db.delete(systemCache)
          .where(eq(systemCache.cacheType, type));
        console.log(`📦 Cache type invalidated: ${type}`);
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    }
  }

  // Cache wrapper for async functions
  async cached<T>(
    options: CacheOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(options);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(options, result);
    return result;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Specific cache helpers
export const sopCache = {
  get: (sopId: string) => cacheManager.get<any>({
    type: 'sop',
    key: sopId,
    ttl: 600000 // 10 minutes
  }),
  
  set: (sopId: string, data: any) => cacheManager.set({
    type: 'sop',
    key: sopId,
    ttl: 600000
  }, data),
  
  invalidate: (sopId?: string) => cacheManager.invalidate('sop', sopId)
};

export const documentCache = {
  get: (docId: string) => cacheManager.get<any>({
    type: 'document',
    key: docId,
    ttl: 1800000 // 30 minutes
  }),
  
  set: (docId: string, data: any) => cacheManager.set({
    type: 'document',
    key: docId,
    ttl: 1800000
  }, data),
  
  invalidate: (docId?: string) => cacheManager.invalidate('document', docId)
};

export const searchCache = {
  get: (query: string) => cacheManager.get<any>({
    type: 'search',
    key: query,
    ttl: 300000 // 5 minutes
  }),
  
  set: (query: string, results: any) => cacheManager.set({
    type: 'search',
    key: query,
    ttl: 300000
  }, results),
  
  invalidate: () => cacheManager.invalidate('search')
};

export default cacheManager;