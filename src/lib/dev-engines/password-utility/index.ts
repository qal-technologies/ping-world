export interface PasswordStrengthReport {
  score: number; // 0 to 100
  rating: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  entropyBits: number;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    specialChar: boolean;
    noCommonWords: boolean;
  };
  feedback: string[];
}

export class PasswordUtilityEngine {
  public trimAndSanitize(password: string): string {
    return (password || '').trim();
  }

  public evaluate(password: string): PasswordStrengthReport {
    try {
      const clean = this.trimAndSanitize(password);
      const feedback: string[] = [];

      const checks = {
        length: clean.length >= 8,
        uppercase: /[A-Z]/.test(clean),
        lowercase: /[a-z]/.test(clean),
        number: /[0-9]/.test(clean),
        specialChar: /[^A-Za-z0-9]/.test(clean),
        noCommonWords: !/^(password|123456|qwerty|admin|letmein)$/i.test(clean),
      };

      if (!checks.length) feedback.push('Password must be at least 8 characters long.');
      if (!checks.uppercase) feedback.push('Add at least one uppercase letter.');
      if (!checks.lowercase) feedback.push('Add at least one lowercase letter.');
      if (!checks.number) feedback.push('Include at least one number.');
      if (!checks.specialChar) feedback.push('Include at least one special character (!@#$%^&*).');

      // Calculate Entropy
      let charsetSize = 0;
      if (checks.lowercase) charsetSize += 26;
      if (checks.uppercase) charsetSize += 26;
      if (checks.number) charsetSize += 10;
      if (checks.specialChar) charsetSize += 32;

      const entropyBits = charsetSize > 0 
        ? Math.round(clean.length * Math.log2(charsetSize)) 
        : 0;

      let score = Math.min(100, Math.round((entropyBits / 80) * 100));
      if (!checks.noCommonWords) score = 10;

      let rating: PasswordStrengthReport['rating'] = 'very_weak';
      if (score >= 80) rating = 'very_strong';
      else if (score >= 60) rating = 'strong';
      else if (score >= 40) rating = 'fair';
      else if (score >= 20) rating = 'weak';

      return {
        score,
        rating,
        entropyBits,
        checks,
        feedback,
      };
    } catch (e) {
      return {
        score: 0,
        rating: 'very_weak',
        entropyBits: 0,
        checks: { length: false, uppercase: false, lowercase: false, number: false, specialChar: false, noCommonWords: false },
        feedback: ['Evaluation error'],
      };
    }
  }

  public compare(password: string, hashOrTarget: string, salt = ''): boolean {
    const clean = this.trimAndSanitize(password);
    if (clean === hashOrTarget) return true;
    const computedHash = this.hash(clean, salt);
    return computedHash === hashOrTarget;
  }

  public hash(password: string, salt = ''): string {
    const combined = this.trimAndSanitize(password) + salt;
    let hashVal = 5381;
    for (let i = 0; i < combined.length; i++) {
      hashVal = (hashVal * 33) ^ combined.charCodeAt(i);
    }
    return (hashVal >>> 0).toString(16).padStart(8, '0');
  }

  public generate(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
