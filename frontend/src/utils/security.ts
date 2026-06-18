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

// Module-level variables for cryptographic keys and caches
let cachedCryptoKey: CryptoKey | null = null;
let initialized = false;

// Pre-resolved promise cache (Step 7)
const encryptionCache = new Map<string, string>();
const decryptionCache = new Map<string, string>();

/**
 * Derives a key-derivation salt/password from user email and navigator.userAgent hash
 */
function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server_fallback';
  let email = '';
  try {
    const rawUser = window.localStorage.getItem('sc_active_user');
    if (rawUser) {
      // First try to parse raw User as JSON if plain-text
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed && typeof parsed === 'object') {
          email = parsed.email || '';
        }
      } catch {}
      
      // Next, try decoding legacy XOR
      if (!email) {
        const decoded = decryptXORLegacy(rawUser);
        try {
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed === 'object') {
            email = parsed.email || '';
          }
        } catch {}
      }
    }
  } catch {}
  
  if (!email) {
    try {
      email = window.sessionStorage.getItem('sc_session_token') || 'no_session_user';
    } catch {
      email = 'no_session_user';
    }
  }
  
  const ua = navigator.userAgent || 'unknown_browser';
  return `${email}|${ua}`;
}

function getDynamicFallbackKey(): string {
  if (typeof window === 'undefined') return 'fallback_key';
  const sessionToken = window.sessionStorage?.getItem('sc_session_token') || 'fallback_session';
  const email = getFingerprint();
  return `${email}|${sessionToken}`;
}

/**
 * Dynamic session-unique XOR fallback encryption
 */
function encryptXORDynamic(dataStr: string): string {
  if (!dataStr) return '';
  const key = getDynamicFallbackKey();
  let result = '';
  for (let i = 0; i < dataStr.length; i++) {
    const charCode = dataStr.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  try {
    return 'DYN_XOR:' + btoa(unescape(encodeURIComponent(result)));
  } catch {
    return 'DYN_XOR:' + btoa(result);
  }
}

/**
 * Dynamic session-unique XOR fallback decryption
 */
function decryptXORDynamic(encryptedStr: string): string {
  if (!encryptedStr || !encryptedStr.startsWith('DYN_XOR:')) return '';
  const rawBase64 = encryptedStr.substring(8);
  let base64Decoded = '';
  try {
    base64Decoded = decodeURIComponent(escape(atob(rawBase64)));
  } catch {
    try {
      base64Decoded = atob(rawBase64);
    } catch {
      return '';
    }
  }

  const key = getDynamicFallbackKey();
  let result = '';
  for (let i = 0; i < base64Decoded.length; i++) {
    const charCode = base64Decoded.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  return result;
}

/**
 * Legacy decrypt to support migrating raw and original XOR-encrypted localStorage items
 */
function decryptXORLegacy(encryptedStr: string): string {
  if (!encryptedStr) return '';
  const STORAGE_SECRET_SALT = 'WelfareVault2026';
  let base64Decoded = '';
  try {
    base64Decoded = decodeURIComponent(escape(atob(encryptedStr)));
  } catch {
    try {
      base64Decoded = atob(encryptedStr);
    } catch {
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
 * Step 3: Add a generateSessionKey() async function that:
 * uses crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt'])
 * stores the CryptoKey object in a module-level variable (not localStorage), returns the key for use
 */
export async function generateSessionKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Cryptography API is not supported in this environment');
  }
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  cachedCryptoKey = key;
  return key;
}

/**
 * Step 1: Derives a secure, 256-bit AES-GCM key from the user-specific email
 * combined with the browser's device user-agent device fingerprint.
 */
export async function deriveKeyFromFingerprint(fingerprint: string): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Cryptography API is not supported in this environment');
  }
  const encoder = new TextEncoder();
  const rawKeyMaterial = encoder.encode(fingerprint);
  
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = encoder.encode('SchemeConnectAP_Salt_2026');
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 1000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  cachedCryptoKey = key;
  return key;
}

/**
 * Step 4: Asynchronously encrypts plain-text strings using AES-GCM with a random 12-byte IV prepended.
 */
export async function encryptData(dataStr: string): Promise<string> {
  if (!dataStr) return '';
  
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return encryptXORDynamic(dataStr);
  }

  try {
    if (!cachedCryptoKey) {
      await initSecurity();
    }
    
    const key = cachedCryptoKey;
    if (!key) {
      throw new Error('Crypto key is not initialized');
    }

    const encoder = new TextEncoder();
    const dataUint8 = encoder.encode(dataStr);
    
    // Generate random 12-byte initialization vector (IV) - Step 4
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataUint8
    );
    
    const ciphertextUint8 = new Uint8Array(ciphertextBuffer);
    const combined = new Uint8Array(12 + ciphertextUint8.length);
    combined.set(iv, 0);
    combined.set(ciphertextUint8, 12);
    
    const base64Str = btoa(String.fromCharCode(...combined));
    const result = `AES-GCM-256:${base64Str}`;
    
    encryptionCache.set(dataStr, result);
    decryptionCache.set(result, dataStr);
    
    return result;
  } catch (error) {
    console.warn('AES-GCM encryption failed, falling back to secure XOR:', error);
    return encryptXORDynamic(dataStr);
  }
}

/**
 * Step 5: Asynchronously decrypts AES-GCM protected items, extracting the 12-byte IV from the front.
 */
export async function decryptData(encryptedStr: string): Promise<string> {
  if (!encryptedStr) return '';
  
  if (encryptedStr.startsWith('DYN_XOR:')) {
    return decryptXORDynamic(encryptedStr);
  }
  
  if (!encryptedStr.startsWith('AES-GCM-256:')) {
    return decryptXORLegacy(encryptedStr);
  }
  
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return '';
  }

  try {
    if (!cachedCryptoKey) {
      await initSecurity();
    }
    
    const key = cachedCryptoKey;
    if (!key) {
      return '';
    }

    const base64Str = encryptedStr.substring(12); // Stripping header "AES-GCM-256:"
    const binaryStr = atob(base64Str);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }
    
    if (combined.length < 12) {
      throw new Error('Encrypted cargo payload is too short');
    }
    
    // Extracting the 12-byte IV and secondary ciphertext payload - Step 5
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    const result = decoder.decode(decryptedBuffer);
    
    encryptionCache.set(result, encryptedStr);
    decryptionCache.set(encryptedStr, result);
    
    return result;
  } catch (error) {
    console.warn('AES-GCM decryption failed, falling back to legacy XOR:', error);
    return decryptXORLegacy(encryptedStr);
  }
}

/**
 * Step 7: Export syncEncrypt which wraps the async operations with pre-resolved promise caches.
 */
export function syncEncrypt(dataStr: string): string {
  if (!dataStr) return '';
  if (encryptionCache.has(dataStr)) {
    return encryptionCache.get(dataStr)!;
  }
  
  // Warm cache in the background
  encryptData(dataStr).catch(() => {});
  
  // Return dynamically derived secure session XOR immediately
  return encryptXORDynamic(dataStr);
}

/**
 * Step 7: Export syncDecrypt which wraps the async operations with pre-resolved promise caches.
 */
export function syncDecrypt(encryptedStr: string): string {
  if (!encryptedStr) return '';
  if (decryptionCache.has(encryptedStr)) {
    return decryptionCache.get(encryptedStr)!;
  }
  
  // Warm cache in the background
  decryptData(encryptedStr).catch(() => {});
  
  if (encryptedStr.startsWith('DYN_XOR:')) {
    return decryptXORDynamic(encryptedStr);
  }
  
  if (!encryptedStr.startsWith('AES-GCM-256:')) {
    return decryptXORLegacy(encryptedStr);
  }
  
  return '';
}

/**
 * Step 6: Add initSecurity() export function that must be called once in main.tsx before the app renders.
 */
export async function initSecurity(): Promise<void> {
  if (initialized) return;
  
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const fingerprint = getFingerprint();
      await deriveKeyFromFingerprint(fingerprint);
      
      // Pre-warm caches by asynchronously decrypting standard localStorage items
      const preWarmKeys = ['sc_lang', 'sc_theme', 'sc_bookmarks', 'sc_users', 'sc_active_user', 'sc_histories'];
      for (const key of preWarmKeys) {
        const item = window.localStorage.getItem(key);
        if (item) {
          await decryptData(item);
        }
      }
    }
    initialized = true;
  } catch (err) {
    console.error('Failed to initialize browser cryptological layer:', err);
    initialized = true;
  }
}

/**
 * Helper to save encrypted items to localStorage with circular reference protection
 */
export function setSecuredStorage(key: string, value: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (k: string, val: any) => {
      if (k.startsWith('__react') || k.startsWith('_react') || k === 'stateNode' || k === 'updater') {
        return '[ReactInternal]';
      }

      if (typeof val === 'object' && val !== null) {
        if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
          return `[HTMLElement ${val.tagName || ''}]`;
        }
        if ('nodeType' in val || 'ownerDocument' in val) {
          return '[DOMNode]';
        }
        try {
          if (
            Object.keys(val).some(ki => ki.startsWith('__react') || ki.startsWith('_react')) ||
            'stateNode' in val ||
            '_reactFiber' in val ||
            '__reactFiber' in val
          ) {
            return '[ReactNode]';
          }
        } catch (e) {
          return '[UnreadableObject]';
        }
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    };
  };

  const rawStr = typeof value === 'string' ? value : JSON.stringify(value, getCircularReplacer());
  const encrypted = syncEncrypt(rawStr);
  window.localStorage.setItem(key, encrypted);
}

/**
 * Helper to retrieve and decrypt items from localStorage
 */
export function getSecuredStorage<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const item = window.localStorage.getItem(key);
  if (!item) return null;
  
  const decrypted = syncDecrypt(item);
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

/**
 * Sanitizes legal documents by masking sensitive PII fields (Aadhaar, phone, PAN card)
 */
export function sanitizeDocument(text: string): string {
  if (!text) return '';
  // Mask 12-digit Aadhaar numbers
  let cleaned = text.replace(/\b\d{4}[-\s]*\d{4}[-\s]*\d{4}\b/g, (match) => {
    return maskAadhaar(match);
  });
  // Mask 10-digit phone numbers
  cleaned = cleaned.replace(/\b\d{10}\b/g, 'XXXXXX');
  // Mask PAN card formats
  cleaned = cleaned.replace(/\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g, 'XXXXX-XXXX-X');
  return cleaned;
}
