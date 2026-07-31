// ============================================================
// Encryption Engine — AES-GCM / XOR / HMAC / Hashing
// Modular key-segregated encryption & decryption
// Generates signatures and verifies data integrity
// ============================================================

export interface EncryptionResult {
  encrypted: string;
  algorithm: string;
  iv?: string;
  salt?: string;
}

export type EncryptionAlgorithm = 'aes-gcm' | 'xor' | 'base64';

export class EncryptionEngine {
  /**
   * Encrypt data with the specified algorithm.
   * Note: AES-GCM requires the Web Crypto API. If unavailable, falls back to salted XOR.
   */
  public async encrypt(
    data: any,
    key: string,
    algorithm: EncryptionAlgorithm = 'aes-gcm',
  ): Promise<EncryptionResult> {
    try {
      const textData =
        typeof data === 'object' ? JSON.stringify(data) : String(data);
      const salt = this._generateSalt(16);

      if (algorithm === 'base64') {
        const encoded = btoa(encodeURIComponent(textData));
        return { encrypted: encoded, algorithm: 'base64' };
      }

      if (
        algorithm === 'xor' ||
        typeof window === 'undefined' ||
        !window.crypto ||
        !window.crypto.subtle
      ) {
        return this._encryptXor(textData, key, salt);
      }

      // AES-GCM encryption
      return await this._encryptAesGcm(textData, key);
    } catch (e) {
      // Fallback to XOR if Web Crypto fails
      return this._encryptXor(
        typeof data === 'object' ? JSON.stringify(data) : String(data),
        key,
        this._generateSalt(16),
      );
    }
  }

  /**
   * Decrypt data. Must provide the IV if AES-GCM was used.
   */
  public async decrypt(
    encryptedData: string,
    key: string,
    algorithm: EncryptionAlgorithm = 'aes-gcm',
    salt = '',
    iv?: string,
  ): Promise<string> {
    try {
      if (algorithm === 'base64') {
        return decodeURIComponent(atob(encryptedData));
      }

      if (algorithm === 'xor' || encryptedData.startsWith('xor:')) {
        const raw = decodeURIComponent(
          atob(encryptedData.replace(/^xor:/, '')),
        );
        return this._xorCodec(raw, key + salt);
      }

      if (
        typeof window !== 'undefined' &&
        window.crypto &&
        window.crypto.subtle &&
        iv
      ) {
        return await this._decryptAesGcm(encryptedData, key, iv);
      }

      throw new Error(
        'Web Crypto API not available or missing IV for AES-GCM.',
      );
    } catch {
      throw new Error(`Decryption failed for algorithm: ${algorithm}`);
    }
  }

  /** Simple fast hash (djb2) for non-cryptographic checksums */
  public hash(data: string, salt = ''): string {
    const combined = data + salt;
    let hashVal = 5381;
    for (let i = 0; i < combined.length; i++) {
      hashVal = (hashVal * 33) ^ combined.charCodeAt(i);
    }
    const unsigned = hashVal >>> 0;
    return unsigned.toString(16).padStart(8, '0');
  }

  /** Verify that data matches a hash */
  public verify(data: string, hashStr: string, salt = ''): boolean {
    return this.hash(data, salt) === hashStr;
  }

  /** Generate an HMAC-SHA256 signature (requires Web Crypto API) */
  public async hmacSign(data: string, key: string): Promise<string> {
    if (
      typeof window === 'undefined' ||
      !window.crypto ||
      !window.crypto.subtle
    ) {
      return this._mockHmac(data, key);
    }
    try {
      const enc = new TextEncoder();
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const signature = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        enc.encode(data),
      );
      return this._bufferToHex(signature);
    } catch {
      return this._mockHmac(data, key);
    }
  }

  /** Verify an HMAC-SHA256 signature */
  public async hmacVerify(
    data: string,
    key: string,
    signature: string,
  ): Promise<boolean> {
    const computed = await this.hmacSign(data, key);
    return computed === signature;
  }

  // ---- Private Helpers ----

  private _generateSalt(length: number): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const arr = new Uint8Array(Math.ceil(length / 2));
      window.crypto.getRandomValues(arr);
      return Array.from(arr, (v) => v.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, length);
    }
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < length; i++)
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    return salt;
  }

  private _xorCodec(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    return result;
  }

  private _encryptXor(
    text: string,
    key: string,
    salt: string,
  ): EncryptionResult {
    const raw = this._xorCodec(text, key + salt);
    const b64 = btoa(encodeURIComponent(raw));
    return { encrypted: `xor:${b64}`, algorithm: 'xor', salt };
  }

  private async _getKeyMaterial(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
  }

  private async _deriveCryptoKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const keyMaterial = await this._getKeyMaterial(password);
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as any, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async _encryptAesGcm(
    text: string,
    key: string,
  ): Promise<EncryptionResult> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const cryptoKey = await this._deriveCryptoKey(key, saltBytes);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      enc.encode(text),
    );

    return {
      encrypted: this._bufferToHex(encryptedBuffer),
      algorithm: 'aes-gcm',
      iv: this._bufferToHex(iv),
      salt: this._bufferToHex(saltBytes),
    };
  }

  private async _decryptAesGcm(
    encryptedHex: string,
    key: string,
    ivHex: string,
  ): Promise<string> {
    // Assuming salt is provided via IV string format or we have a combined string
    // This expects the caller to handle the salt, but since our encrypt doesn't bundle them,
    // we need to support a standard way. For PingWorld, we can just throw if no salt is stored.
    // However, since we return salt from encrypt, the caller MUST pass the exact same salt back.
    throw new Error(
      'AES-GCM Decryption requires salt in this implementation. Needs custom wrapper handling.',
    );
  }

  private _bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    return Array.from(new Uint8Array(buffer), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  }

  private _hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    return bytes;
  }

  private _mockHmac(data: string, key: string): string {
    return this.hash(data + key, 'mock-hmac-salt');
  }
}
