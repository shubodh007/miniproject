import { ProfilePayload, SchemeResult } from '../types';
import { hashProfileFields } from './security';
import { logger } from './logger';

class SessionCache {
  private cache: Map<string, SchemeResult[]> = new Map();
  private lastProfileHash: string | null = null;

  /**
   * Retrieves cached match results if available.
   * If profile changes, invalidates previous cache.
   */
  public get(profile: ProfilePayload): SchemeResult[] | null {
    if (!profile) return null;
    const currentHash = hashProfileFields(profile);

    // Auto-invalidates if a different profile snapshot has been submitted under this session
    if (this.lastProfileHash && this.lastProfileHash !== currentHash) {
      logger.info(`Profile changed. Invalidating cache. Prev Hash: [${this.lastProfileHash}] -> New Hash: [${currentHash}]`);
      this.cache.clear();
      this.lastProfileHash = currentHash;
      return null;
    }

    this.lastProfileHash = currentHash;
    const entry = this.cache.get(currentHash);
    if (entry) {
      logger.info(`Session Cache HIT for profile hash: ${currentHash}`);
      return entry;
    }

    logger.info(`Session Cache MISS for profile hash: ${currentHash}`);
    return null;
  }

  /**
   * Sets cached match results
   */
  public set(profile: ProfilePayload, results: SchemeResult[]): void {
    if (!profile) return;
    const currentHash = hashProfileFields(profile);
    this.lastProfileHash = currentHash;
    this.cache.set(currentHash, results);
    logger.info(`Success caching results for profile hash: ${currentHash}`);
  }

  /**
   * Force clear the cache
   */
  public clear(): void {
    logger.info('Wiping all cached items from Session Cache');
    this.cache.clear();
    this.lastProfileHash = null;
  }
}

export const sessionCache = new SessionCache();
