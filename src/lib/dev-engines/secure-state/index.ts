// ============================================================
// Secure State Manager — Encrypted key-value store
// Cross-environment (Web / React Native / Node)
// One-time read features, namespaced categories, TTL
// ============================================================

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

  /** Store encrypted state with one-time read capability */
  public setSecretState(
    key: string,
    data: any,
    secretKey: string,
    options: StateOptions = {},
  ): boolean {
    try {
      if (!key || !secretKey) return false;
      const textData = JSON.stringify(data);
      const salt = this._generateSalt(12);
      const saltedSecret = secretKey + salt;

      let encrypted = '';
      for (let i = 0; i < textData.length; i++) {
        encrypted += String.fromCharCode(
          textData.charCodeAt(i) ^
            saltedSecret.charCodeAt(i % saltedSecret.length),
        );
      }

      const b64 = this._btoa(encrypted);
      const expiresAt = options.ttlMs ? Date.now() + options.ttlMs : null;

      this.store.set(key, {
        encryptedPayload: b64,
        category: options.category || 'default',
        oneTimeRead: options.oneTimeRead || false,
        expiresAt,
        salt,
      });

      return true;
    } catch {
      return false;
    }
  }

  /** Retrieve and decrypt state. Destroys record if oneTimeRead is true. */
  public getSecretState<T = any>(key: string, secretKey: string): T | null {
    try {
      const record = this.store.get(key);
      if (!record) return null;

      // Check TTL expiry
      if (record.expiresAt && Date.now() > record.expiresAt) {
        this.store.delete(key);
        return null;
      }

      const saltedSecret = secretKey + record.salt;
      const raw = this._atob(record.encryptedPayload);

      let decrypted = '';
      for (let i = 0; i < raw.length; i++) {
        decrypted += String.fromCharCode(
          raw.charCodeAt(i) ^ saltedSecret.charCodeAt(i % saltedSecret.length),
        );
      }

      const data = JSON.parse(decrypted);

      // Enforce one-time read
      if (record.oneTimeRead) {
        this.store.delete(key);
      }

      return data as T;
    } catch {
      return null;
    }
  }

  /** Remove specific key manually */
  public remove(key: string): boolean {
    return this.store.delete(key);
  }

  /** Clear all keys within a category namespace */
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

  /** Verify existence without decrypting */
  public hasKey(key: string): boolean {
    const record = this.store.get(key);
    if (!record) return false;
    if (record.expiresAt && Date.now() > record.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  // ---- Polyfills strictly for RN / Node.js ----

  private _btoa(str: string): string {
    if (typeof btoa !== 'undefined') return btoa(encodeURIComponent(str));
    if (typeof Buffer !== 'undefined')
      return Buffer.from(str).toString('base64');
    return str; // fallback for strange environments
  }

  private _atob(str: string): string {
    if (typeof atob !== 'undefined') return decodeURIComponent(atob(str));
    if (typeof Buffer !== 'undefined')
      return Buffer.from(str, 'base64').toString('utf-8');
    return str;
  }

  private _generateSalt(len: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < len; i++)
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    return salt;
  }
}
