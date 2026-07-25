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
  public createSessionToken(
    payload: Partial<SessionPayload> & { userId: string },
    secret: string,
    expiresInMs = 86400000,
  ): string {
    try {
      const now = Date.now();
      const fullPayload: SessionPayload = {
        sessionId: `sess_${now}_${Math.random().toString(36).substring(2, 8)}`,
        role: 'user',
        ...payload,
        createdAt: now,
        expiresAt: now + expiresInMs,
      };

      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));

      const signature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (e) {
      throw new Error(`Session token creation failed: ${(e as Error).message}`);
    }
  }

  public verifySessionToken(
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
      const expectedSignature = this.sign(
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

      const payloadText = this.base64UrlDecode(encodedPayload);
      const payload: SessionPayload = JSON.parse(payloadText);

      const isExpired = Date.now() > payload.expiresAt;

      return {
        valid: !isExpired,
        expired: isExpired,
        payload,
        error: isExpired ? 'Session expired' : undefined,
      };
    } catch (e) {
      return {
        valid: false,
        expired: false,
        payload: null,
        error: 'Corrupted payload',
      };
    }
  }

  public rotateSessionToken(
    token: string,
    secret: string,
    extensionMs = 86400000,
  ): string {
    const verified = this.verifySessionToken(token, secret);
    if (!verified.payload) {
      throw new Error('Cannot rotate invalid session token');
    }
    return this.createSessionToken(verified.payload, secret, extensionMs);
  }

  public compareSessions(
    token1: string,
    token2: string,
    secret: string,
  ): boolean {
    const v1 = this.verifySessionToken(token1, secret);
    const v2 = this.verifySessionToken(token2, secret);
    if (!v1.valid || !v2.valid || !v1.payload || !v2.payload) return false;
    return (
      v1.payload.sessionId === v2.payload.sessionId &&
      v1.payload.userId === v2.payload.userId
    );
  }

  private sign(data: string, secret: string): string {
    let hash = 5381;
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 33) ^ combined.charCodeAt(i);
    }
    return this.base64UrlEncode((hash >>> 0).toString(16));
  }

  private base64UrlEncode(str: string): string {
    const b64 =
      typeof btoa !== 'undefined' ?
        btoa(encodeURIComponent(str))
      : Buffer.from(str).toString('base64');
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private base64UrlDecode(str: string): string {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return typeof atob !== 'undefined' ?
        decodeURIComponent(atob(b64))
      : Buffer.from(b64, 'base64').toString('utf-8');
  }
}
