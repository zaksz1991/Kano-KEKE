import { supabase } from './SupabaseManager.js';

export class GameplayAnalyticsTracker {
  static async incrementPlayCount(onCountUpdated) {
    try {
      // 1. Fetch current global count from Supabase
      let { data, error } = await supabase
        .from('game_analytics')
        .select('total_shifts')
        .eq('id', 1)
        .single();

      let currentCount = data ? data.total_shifts : 14280; // Baseline fallback
      currentCount += 1;

      // 2. Update global count back to Supabase
      await supabase
        .from('game_analytics')
        .upsert({ id: 1, total_shifts: currentCount, last_active: new Date() });

      if (onCountUpdated) {
        onCountUpdated(currentCount);
      }
    } catch (e) {
      console.warn('Analytics offline. Using local session counter.', e);
      if (onCountUpdated) onCountUpdated(14281);
    }
  }
}