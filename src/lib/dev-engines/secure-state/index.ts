export interface StateOptions {
  category?: string;
  oneTimeRead?: boolean;
  ttlMs?: number;
}

interface StoredStateRecord {
  encryptedPayload: string;
  category: string;
  oneTimeRead: boolean;
  expiresAt: number | null;
  salt: string;
}

export class SecureStateManager {
  private static instance: SecureStateManager;
  private store: Map<string, StoredStateRecord> = new Map();

  public static getInstance(): SecureStateManager {
    if (!SecureStateManager.instance) {
      SecureStateManager.instance = new SecureStateManager();
    }
    return SecureStateManager.instance;
  }

  public setSecretState(
    key: string,
    data: any,
    secretKey: string,
    options: StateOptions = {}
  ): boolean {
    try {
      if (!key || !secretKey) return false;
      const textData = JSON.stringify(data);
      const salt = this.generateSalt(8);
      const saltedSecret = secretKey + salt;

      // Encrypt payload
      let encrypted = '';
      for (let i = 0; i < textData.length; i++) {
        const charCode = textData.charCodeAt(i) ^ saltedSecret.charCodeAt(i % saltedSecret.length);
        encrypted += String.fromCharCode(charCode);
      }
      const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(encrypted)) : Buffer.from(encrypted).toString('base64');

      const expiresAt = options.ttlMs ? Date.now() + options.ttlMs : null;

      this.store.set(key, {
        encryptedPayload: b64,
        category: options.category || 'default',
        oneTimeRead: options.oneTimeRead || false,
        expiresAt,
        salt,
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  public getSecretState<T = any>(key: string, secretKey: string): T | null {
    try {
      const record = this.store.get(key);
      if (!record) return null;

      // Check TTL
      if (record.expiresAt && Date.now() > record.expiresAt) {
        this.store.delete(key);
        return null;
      }

      const saltedSecret = secretKey + record.salt;
      const raw = typeof atob !== 'undefined' 
        ? decodeURIComponent(atob(record.encryptedPayload)) 
        : Buffer.from(record.encryptedPayload, 'base64').toString('utf-8');

      let decrypted = '';
      for (let i = 0; i < raw.length; i++) {
        const charCode = raw.charCodeAt(i) ^ saltedSecret.charCodeAt(i % saltedSecret.length);
        decrypted += String.fromCharCode(charCode);
      }

      const data = JSON.parse(decrypted);

      if (record.oneTimeRead) {
        this.store.delete(key);
      }

      return data as T;
    } catch (e) {
      // Key mismatch or corrupted payload
      return null;
    }
  }

  public clearCategory(category: string): number {
    let count = 0;
    for (const [key, record] of this.store.entries()) {
      if (record.category === category) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  public hasKey(key: string): boolean {
    const record = this.store.get(key);
    if (!record) return false;
    if (record.expiresAt && Date.now() > record.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  private generateSalt(len: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < len; i++) salt += chars.charAt(Math.floor(Math.random() * chars.length));
    return salt;
  }
}
