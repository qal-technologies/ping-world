import { supabase } from '@/lib/supabase';
import { PREMIUM_TIERS, PremiumTier } from '@/lib/config/premium';

export interface QuotaStatus {
  used: number;
  limit: number;
  allowed: boolean;
}

export class AiQuotaSyncer {
  private static LOCAL_KEY = 'pw_ai_usage_today';

  /**
   * Get the allowed limit for a specific tier based on pricing rules.
   */
  public static getDailyLimit(tier: PremiumTier): number {
    const limits: Record<PremiumTier, number> = {
      free: 5,
      flexible: 15,
      standard: 30,
      pro: 60,
    };
    return limits[tier] || 5;
  }

  /**
   * Fetch current daily AI usage count.
   * Leverages cached localStorage first and synchronizes with Supabase metadata.
   */
  public static getLocalCount(): number {
    if (typeof window === 'undefined') return 0;
    const cached = localStorage.getItem(this.LOCAL_KEY);
    if (!cached) return 0;

    try {
      const parsed = JSON.parse(cached);
      const todayStr = new Date().toDateString();
      if (parsed.date === todayStr) {
        return parsed.count || 0;
      } else {
        // New day, reset tally
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify({ date: todayStr, count: 0 }));
        return 0;
      }
    } catch {
      return 0;
    }
  }

  /**
   * Increment daily usage tally locally and sync to database.
   */
  public static incrementLocalCount(): number {
    if (typeof window === 'undefined') return 1;
    const todayStr = new Date().toDateString();
    const count = this.getLocalCount() + 1;
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify({ date: todayStr, count }));

    // Async batch sync to DB to reduce load
    this.syncToDb(count);

    return count;
  }

  /**
   * Check if user is within their allowed daily tier quota.
   */
  public static checkQuota(tier: PremiumTier): QuotaStatus {
    const limit = this.getDailyLimit(tier);
    const used = this.getLocalCount();
    return {
      used,
      limit,
      allowed: used < limit,
    };
  }

  /**
   * Sync daily count to Supabase user metadata asynchronously.
   */
  private static async syncToDb(count: number) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const user = session.user;
      const todayStr = new Date().toDateString();

      // Store in user metadata so it is secure and persistent
      const currentMeta = user.user_metadata || {};
      const usageLog = currentMeta.ai_usage_log || {};

      usageLog[todayStr] = count;

      await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          ai_usage_log: usageLog,
        }
      });
    } catch (err) {
      console.error('[AiQuotaSyncer] Sync failed:', err);
    }
  }
}
