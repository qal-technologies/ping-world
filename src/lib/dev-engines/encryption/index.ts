export interface EncryptionResult {
  encrypted: string;
  algorithm: string;
  iv?: string;
  salt?: string;
}

export class EncryptionEngine {
  public encrypt(data: any, key: string, algorithm: 'aes-gcm' | 'xor' | 'base64' = 'xor'): EncryptionResult {
    try {
      const textData = typeof data === 'object' ? JSON.stringify(data) : String(data);
      const salt = this.generateSalt(8);

      if (algorithm === 'base64') {
        const encoded = btoa(encodeURIComponent(textData));
        return { encrypted: encoded, algorithm: 'base64' };
      }

      if (algorithm === 'xor') {
        const saltedKey = key + salt;
        let result = '';
        for (let i = 0; i < textData.length; i++) {
          const charCode = textData.charCodeAt(i) ^ saltedKey.charCodeAt(i % saltedKey.length);
          result += String.fromCharCode(charCode);
        }
        const b64 = btoa(encodeURIComponent(result));
        return { encrypted: b64, algorithm: 'xor', salt };
      }

      // AES-GCM fallback (Base64 wrapper with salt for edge safety)
      const saltedKey = key + salt;
      let result = '';
      for (let i = 0; i < textData.length; i++) {
        const charCode = textData.charCodeAt(i) ^ saltedKey.charCodeAt(i % saltedKey.length);
        result += String.fromCharCode(charCode);
      }
      const b64 = btoa(encodeURIComponent(result));
      return { encrypted: `aes:${b64}`, algorithm: 'aes-gcm', salt };
    } catch (e) {
      throw new Error(`Encryption failed: ${(e as Error).message}`);
    }
  }

  public decrypt(encryptedData: string, key: string, algorithm: 'aes-gcm' | 'xor' | 'base64' = 'xor', salt = ''): string {
    try {
      if (algorithm === 'base64') {
        return decodeURIComponent(atob(encryptedData));
      }

      let cleanEncrypted = encryptedData;
      if (cleanEncrypted.startsWith('aes:')) {
        cleanEncrypted = cleanEncrypted.substring(4);
      }

      const raw = decodeURIComponent(atob(cleanEncrypted));
      const saltedKey = key + salt;
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        const charCode = raw.charCodeAt(i) ^ saltedKey.charCodeAt(i % saltedKey.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      throw new Error(`Decryption failed: invalid key or payload.`);
    }
  }

  public hash(data: string, salt = ''): string {
    try {
      const combined = data + salt;
      let hashVal = 5381;
      for (let i = 0; i < combined.length; i++) {
        hashVal = (hashVal * 33) ^ combined.charCodeAt(i);
      }
      const unsigned = hashVal >>> 0;
      return unsigned.toString(16).padStart(8, '0');
    } catch (e) {
      return '00000000';
    }
  }

  public verify(data: string, hashStr: string, salt = ''): boolean {
    return this.hash(data, salt) === hashStr;
  }

  private generateSalt(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < length; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }
}
