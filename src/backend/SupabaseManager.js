import { createClient } from '@supabase/supabase-js';

// Initialize your Supabase client using environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseManager {
  static async syncProfileToCloud(userId, profileData) {
    const { data, error } = await supabase
      .from('player_profiles')
      .upsert({ user_id: userId, ...profileData, updated_at: new Date() });
    
    if (error) console.error('Supabase Sync Error:', error.message);
    return data;
  }

  static async submitHighScore(driverName, netSavings) {
    const { error } = await supabase
      .from('kano_leaderboard')
      .insert({ driver_name: driverName, net_savings: netSavings, created_at: new Date() });
    
    if (error) console.error('Leaderboard Submit Error:', error.message);
  }
}