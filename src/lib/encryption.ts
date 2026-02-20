// Client-side encryption utilities using Web Crypto API
// Uses ECDH key exchange for proper per-user encryption

const KEY_CACHE = new Map<string, CryptoKey>();

// Generate an ECDH key pair for the current user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

// Export a public key to a storable JSON format
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(exported);
}

// Import a public key from stored JSON format
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

// Export a private key (for local storage only - never send to server)
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(exported);
}

// Import a private key from local storage
export async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

// Derive a shared AES key from our private key + their public key
async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey, chatId: string): Promise<CryptoKey> {
  const cacheKey = chatId;
  if (KEY_CACHE.has(cacheKey)) {
    return KEY_CACHE.get(cacheKey)!;
  }

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  KEY_CACHE.set(cacheKey, sharedKey);
  return sharedKey;
}

// Fallback: derive a key from chat ID (for backward compatibility with existing messages)
async function deriveKeyFromChatId(chatId: string): Promise<CryptoKey> {
  if (KEY_CACHE.has(`legacy_${chatId}`)) {
    return KEY_CACHE.get(`legacy_${chatId}`)!;
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(chatId + '_lovable_chat_key_v1'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lovable_secure_chat_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  KEY_CACHE.set(`legacy_${chatId}`, key);
  return key;
}

// Get or create the user's key pair, stored in localStorage
export async function getOrCreateUserKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
  const storedPrivate = localStorage.getItem('chat_private_key');
  const storedPublic = localStorage.getItem('chat_public_key');

  if (storedPrivate && storedPublic) {
    try {
      const privateKey = await importPrivateKey(storedPrivate);
      const publicKey = await importPublicKey(storedPublic);
      return { privateKey, publicKey };
    } catch {
      // Corrupted keys, regenerate
      localStorage.removeItem('chat_private_key');
      localStorage.removeItem('chat_public_key');
    }
  }

  const keyPair = await generateKeyPair();
  localStorage.setItem('chat_private_key', await exportPrivateKey(keyPair.privateKey));
  localStorage.setItem('chat_public_key', await exportPublicKey(keyPair.publicKey));
  return keyPair;
}

// Encrypt a message - uses ECDH shared key if keys available, falls back to legacy
export async function encryptMessage(
  plaintext: string, 
  chatId: string,
  privateKey?: CryptoKey,
  recipientPublicKey?: CryptoKey
): Promise<string> {
  let key: CryptoKey;
  let prefix = '';
  
  if (privateKey && recipientPublicKey) {
    key = await deriveSharedKey(privateKey, recipientPublicKey, chatId);
    prefix = 'v2:'; // Mark as using ECDH encryption
  } else {
    key = await deriveKeyFromChatId(chatId);
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedText
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return prefix + btoa(String.fromCharCode(...combined));
}

// Decrypt a message - detects version and uses appropriate key
export async function decryptMessage(
  encryptedData: string, 
  chatId: string,
  privateKey?: CryptoKey,
  senderPublicKey?: CryptoKey
): Promise<string> {
  try {
    let data = encryptedData;
    let key: CryptoKey;

    if (data.startsWith('v2:')) {
      // ECDH encrypted message
      data = data.slice(3);
      if (!privateKey || !senderPublicKey) {
        return '[Missing encryption keys]';
      }
      key = await deriveSharedKey(privateKey, senderPublicKey, chatId);
    } else {
      // Legacy encryption
      key = await deriveKeyFromChatId(chatId);
    }

    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Unable to decrypt message]';
  }
}

// Check if a string is encrypted (base64 with proper length)
export function isEncrypted(text: string): boolean {
  try {
    const data = text.startsWith('v2:') ? text.slice(3) : text;
    const decoded = atob(data);
    return decoded.length > 12;
  } catch {
    return false;
  }
}

// Clear the key cache (e.g., on logout)
export function clearKeyCache(): void {
  KEY_CACHE.clear();
}
