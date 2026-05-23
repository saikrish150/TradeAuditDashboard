/**
 * Web Crypto AES-256-CBC Encryption Utility.
 * Encrypts client API keys/secrets in-browser before storing in database.
 * Completely zero-dependency and high performance.
 */
export async function encryptCredential(text, encryptionKey) {
  if (!text) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Ensure key is exactly 32 bytes for AES-256
    const keyBytes = encoder.encode(String(encryptionKey).padEnd(32, '0').substring(0, 32));
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );
    
    // Create random 16-byte Initialization Vector
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      data
    );
    
    // Transform arrays into hex representations for database string storage
    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const dataHex = Array.from(new Uint8Array(encryptedBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
      
    return `${ivHex}:${dataHex}`;
  } catch (err) {
    console.error('Frontend credential encryption failed:', err);
    throw new Error('Encryption error: ' + err.message);
  }
}

/**
 * Checks credentials validity (basic format verification).
 */
export function validateDeltaCredentials(apiKey, apiSecret) {
  if (!apiKey || apiKey.trim().length < 8) {
    return { valid: false, error: 'Invalid API Key length' };
  }
  if (!apiSecret || apiSecret.trim().length < 8) {
    return { valid: false, error: 'Invalid API Secret length' };
  }
  return { valid: true };
}
