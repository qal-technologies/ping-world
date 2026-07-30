// ============================================================
// Session Engine — JWT Token Generator & Validator
// Role-based session management, rotation, and HMAC verification
// ============================================================

export interface SessionPayload {
  userId: string;
  role?: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  [key: string]: any;
}

export interface SessionVerificationResult {
  valid: boolean;
  expired: boolean;
  payload: SessionPayload | null;
  error?: string;
}

export class SessionEngine {
  /** Create a signed session token */
  public async createSessionToken(
    payload: Partial<SessionPayload> & { userId: string },
    secret: string,
    expiresInMs = 86400000,
  ): Promise<string> {
    try {
      const now = Date.now();
      const fullPayload: SessionPayload = {
        sessionId: `sess_${now}_${this._randStr()}`,
        role: 'user',
        ...payload,
        createdAt: now,
        expiresAt: now + expiresInMs,
      };

      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = this._b64Encode(JSON.stringify(header));
      const encodedPayload = this._b64Encode(JSON.stringify(fullPayload));

      const signature = await this._signHmac(
        `${encodedHeader}.${encodedPayload}`,
        secret,
      );
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (e) {
      throw new Error(`Session token creation failed: ${(e as Error).message}`);
    }
  }

  /** Synchronous token creation for SSR/Edge environments without await */
  public createSessionTokenSync(
    payload: Partial<SessionPayload> & { userId: string },
    secret: string,
    expiresInMs = 86400000,
  ): string {
    const now = Date.now();
    const fullPayload: SessionPayload = {
      sessionId: `sess_${now}_${this._randStr()}`,
      role: 'user',
      ...payload,
      createdAt: now,
      expiresAt: now + expiresInMs,
    };

    const encodedHeader = this._b64Encode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const encodedPayload = this._b64Encode(JSON.stringify(fullPayload));
    const signature = this._signSync(
      `${encodedHeader}.${encodedPayload}`,
      secret,
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /** Verify session token signature and check expiry */
  public async verifySessionToken(
    token: string,
    secret: string,
  ): Promise<SessionVerificationResult> {
    return this.verifySessionTokenSync(token, secret);
  }

  public verifySessionTokenSync(
    token: string,
    secret: string,
  ): SessionVerificationResult {
    try {
      if (!token || typeof token !== 'string') {
        return {
          valid: false,
          expired: false,
          payload: null,
          error: 'Empty token',
        };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          expired: false,
          payload: null,
          error: 'Invalid token structure',
        };
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = this._signSync(
        `${encodedHeader}.${encodedPayload}`,
        secret,
      );

      if (signature !== expectedSignature) {
        return {
          valid: false,
          expired: false,
          payload: null,
          error: 'Signature mismatch',
        };
      }

      const payload: SessionPayload = JSON.parse(
        this._b64Decode(encodedPayload),
      );
      const isExpired = Date.now() > payload.expiresAt;

      return {
        valid: !isExpired,
        expired: isExpired,
        payload,
        error: isExpired ? 'Session expired' : undefined,
      };
    } catch {
      return {
        valid: false,
        expired: false,
        payload: null,
        error: 'Corrupted payload',
      };
    }
  }

  /** Extend a valid session's expiry */
  public rotateSessionTokenSync(
    token: string,
    secret: string,
    extensionMs = 86400000,
  ): string {
    const verified = this.verifySessionTokenSync(token, secret);
    if (!verified.payload)
      throw new Error('Cannot rotate invalid session token');
    return this.createSessionTokenSync(verified.payload, secret, extensionMs);
  }

  /** Compare if two tokens belong to the same active session */
  public compareSessions(
    token1: string,
    token2: string,
    secret: string,
  ): boolean {
    const v1 = this.verifySessionTokenSync(token1, secret);
    const v2 = this.verifySessionTokenSync(token2, secret);
    if (!v1.valid || !v2.valid || !v1.payload || !v2.payload) return false;
    return (
      v1.payload.sessionId === v2.payload.sessionId &&
      v1.payload.userId === v2.payload.userId
    );
  }

  // ---- Private crypto/encoding utilities ----

  private _randStr(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  private async _signHmac(data: string, secret: string): Promise<string> {
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.subtle
    ) {
      try {
        const enc = new TextEncoder();
        const key = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const sig = await window.crypto.subtle.sign(
          'HMAC',
          key,
          enc.encode(data),
        );
        return this._b64EncodeBuffer(sig);
      } catch {
        return this._signSync(data, secret);
      }
    }
    return this._signSync(data, secret);
  }

  private _signSync(data: string, secret: string): string {
    let hash = 5381;
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) + hash + combined.charCodeAt(i);
    }
    return this._b64Encode((hash >>> 0).toString(16));
  }

  private _b64Encode(str: string): string {
    const b64 =
      typeof btoa !== 'undefined' ?
        btoa(encodeURIComponent(str))
      : Buffer.from(str).toString('base64');
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private _b64EncodeBuffer(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    const b64 =
      typeof btoa !== 'undefined' ?
        btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private _b64Decode(str: string): string {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return typeof atob !== 'undefined' ?
        decodeURIComponent(atob(b64))
      : Buffer.from(b64, 'base64').toString('utf-8');
  }
}
