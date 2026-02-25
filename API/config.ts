// API Configuration for Identity Generation System

import crypto from 'crypto';

// API Configuration
export const API_CONFIG = {
  // API version
  version: 'v1',
  
  // API endpoints
  endpoints: {
    generate: '/api/v1/identities/generate',
    bulkGenerate: '/api/v1/identities/bulk-generate',
    health: '/api/v1/health',
    external: '/api/external/identity'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Hash algorithm settings
  hash: {
    algorithm: 'sha256',
    salt: process.env.API_SALT || 'identitygen-secret-salt-2026',
    keyLength: 32
  },
  
  // API key settings
  apiKey: {
    header: 'X-API-Key',
    prefix: 'sk_',
    length: 32
  },
  
  // Response format
  response: {
    success: {
      status: 'success',
      code: 200
    },
    error: {
      unauthorized: {
        status: 'error',
        code: 401,
        message: 'Unauthorized: Invalid API key'
      },
      badRequest: {
        status: 'error',
        code: 400,
        message: 'Bad request: Missing required parameters'
      },
      serverError: {
        status: 'error',
        code: 500,
        message: 'Server error: Failed to process request'
      }
    }
  }
};

// HashKeyManager class for managing API keys based on content hash
export class HashKeyManager {
  private keyCache: Map<string, { contentHash: string; createdAt: number; expiresAt: number }>;
  private keyExpiry: number;

  constructor() {
    this.keyCache = new Map();
    this.keyExpiry = 90 * 24 * 60 * 60 * 1000; // 90 days (3 months)
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredKeys(), 60 * 60 * 1000); // Cleanup every hour
  }

  // Generate a new API key from content hash
  generateKey(contentHash: string): string {
    const combined = contentHash + API_CONFIG.hash.salt + Date.now();
    const key = crypto
      .createHash(API_CONFIG.hash.algorithm)
      .update(combined)
      .digest('hex')
      .substring(0, API_CONFIG.apiKey.length);
    
    this.keyCache.set(key, {
      contentHash,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.keyExpiry
    });
    
    return API_CONFIG.apiKey.prefix + key;
  }

  // Verify API key
  verifyKey(key: string): boolean {
    const cleanKey = key.replace(API_CONFIG.apiKey.prefix, '');
    const keyInfo = this.keyCache.get(cleanKey);
    
    if (!keyInfo) return false;
    
    // Check if key has expired
    if (Date.now() > keyInfo.expiresAt) {
      this.keyCache.delete(cleanKey);
      return false;
    }
    
    return true;
  }

  // Get content hash for a key
  getContentHash(key: string): string | null {
    const cleanKey = key.replace(API_CONFIG.apiKey.prefix, '');
    const keyInfo = this.keyCache.get(cleanKey);
    return keyInfo ? keyInfo.contentHash : null;
  }

  // Cleanup expired keys
  cleanupExpiredKeys(): void {
    const now = Date.now();
    for (const [key, info] of this.keyCache.entries()) {
      if (now > info.expiresAt) {
        this.keyCache.delete(key);
      }
    }
  }

  // Clear all keys
  clearKeys(): void {
    this.keyCache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.keyCache.size;
  }
}

// Global instance of HashKeyManager
export const hashKeyManager = new HashKeyManager();

// Helper function to generate content hash
export function generateContentHash(data: any): string {
  return crypto
    .createHash(API_CONFIG.hash.algorithm)
    .update(JSON.stringify(data))
    .digest('hex');
}

// Helper function to generate signature
export function generateSignature(data: any, key: string): string {
  const cleanKey = key.replace(API_CONFIG.apiKey.prefix, '');
  return crypto
    .createHmac(API_CONFIG.hash.algorithm, cleanKey)
    .update(JSON.stringify(data))
    .digest('hex');
}

// Helper function to validate API key
export function validateApiKey(req: any): boolean {
  const apiKey = req.headers[API_CONFIG.apiKey.header.toLowerCase()];
  if (!apiKey) return false;
  return hashKeyManager.verifyKey(apiKey);
}
