/**
 * Security layer for government welfare scheme chatbot.
 * Handles Aadhaar masking, profile hashing, and browser storage encryption.
 */

/**
 * Mask Aadhaar number to only reveal the last 4 digits before any API transmission
 * e.g., "1234 5678 9012" -> "XXXX XXXX 9012"
 */
export function maskAadhaar(aadhaar: string | undefined): string {
  if (!aadhaar) return '';
  // Strip non-digits
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Deterministic hash of profile matching fields for session caching/identification
 */
export function hashProfileFields(profile: any): string {
  if (!profile) return 'empty';
  
  // Extract only matching criteria to build key
  const nameClean = (profile.name || '').trim().toLowerCase();
  const districtClean = (profile.district || '').trim().toLowerCase();
  const stateClean = (profile.state || '').trim().toLowerCase();
  
  const keySource = [
    nameClean,
    profile.age || 0,
    profile.gender || '',
    profile.income_annual || 0,
    districtClean,
    stateClean,
    profile.caste_category || '',
    profile.isTenantFarmer ? '1' : '0',
    profile.hasCCRC ? '1' : '0',
    profile.habitation || 'Rural'
  ].join('|');

  // Simple, deterministic fnv1a fast hash function (32-bit)
  let hash = 2166136261;
  for (let i = 0; i < keySource.length; i++) {
    hash ^= keySource.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

const STORAGE_SECRET_SALT = 'WelfareVault2026';

/**
 * Simple cipher-based encryption to secure PII (Name, Aadhaar, Income) in browser local storage
 */
export function encryptData(dataStr: string): string {
  if (!dataStr) return '';
  let result = '';
  for (let i = 0; i < dataStr.length; i++) {
    const charCode = dataStr.charCodeAt(i);
    const saltChar = STORAGE_SECRET_SALT.charCodeAt(i % STORAGE_SECRET_SALT.length);
    // Symmetric XOR shift
    result += String.fromCharCode(charCode ^ saltChar);
  }
  // Base64 encode to make it safe for string storage
  try {
    return btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    // Fallback if safe UTF-8 fails
    return btoa(result);
  }
}

/**
 * Decrypt data from browser local storage
 */
export function decryptData(encryptedStr: string): string {
  if (!encryptedStr) return '';
  let base64Decoded = '';
  try {
    base64Decoded = decodeURIComponent(escape(atob(encryptedStr)));
  } catch (e) {
    try {
      base64Decoded = atob(encryptedStr);
    } catch (inner) {
      return '';
    }
  }

  let result = '';
  for (let i = 0; i < base64Decoded.length; i++) {
    const charCode = base64Decoded.charCodeAt(i);
    const saltChar = STORAGE_SECRET_SALT.charCodeAt(i % STORAGE_SECRET_SALT.length);
    result += String.fromCharCode(charCode ^ saltChar);
  }
  return result;
}

/**
 * Helper to save encrypted items to localStorage
 */
/**
 * Helper to save encrypted items to localStorage with circular reference protection
 */
export function setSecuredStorage(key: string, value: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  // Custom replacer to ignore/stub circular structures
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key: string, val: any) => {
      // 1. Prevent traversing standard React internal properties by key name
      if (key.startsWith('__react') || key.startsWith('_react') || key === 'stateNode' || key === 'updater') {
        return '[ReactInternal]';
      }

      if (typeof val === 'object' && val !== null) {
        // 2. Prevent HTMLElement
        if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
          return `[HTMLElement ${val.tagName || ''}]`;
        }
        // 3. Prevent DOM node-like structures
        if ('nodeType' in val || 'ownerDocument' in val) {
          return '[DOMNode]';
        }
        // 4. Prevent objects with React properties
        try {
          if (
            Object.keys(val).some(k => k.startsWith('__react') || k.startsWith('_react')) ||
            'stateNode' in val ||
            '_reactFiber' in val ||
            '__reactFiber' in val
          ) {
            return '[ReactNode]';
          }
        } catch (e) {
          return '[UnreadableObject]';
        }
        // 5. Normal circular references
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    };
  };

  const rawStr = typeof value === 'string' ? value : JSON.stringify(value, getCircularReplacer());
  const encrypted = encryptData(rawStr);
  window.localStorage.setItem(key, encrypted);
}

/**
 * Helper to retrieve and decrypt items from localStorage
 */
export function getSecuredStorage<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const item = window.localStorage.getItem(key);
  if (!item) return null;
  
  // Try decrypting. If it is already in plain text (legacy migration), decrypting might return gibberish or fail,
  // in which case we fall back to raw or parsing raw.
  const decrypted = decryptData(item);
  if (!decrypted) {
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      return item as unknown as T;
    }
  }

  try {
    return JSON.parse(decrypted) as T;
  } catch (e) {
    return decrypted as unknown as T;
  }
}
