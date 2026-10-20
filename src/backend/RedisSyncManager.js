import { supabase } from './SupabaseManager.js';

export class RedisSyncManager {
  constructor() {
    this.channel = null;
    this.isConnected = false;
  }

  connect(onPlayerUpdate) {
    if (!supabase) {
      console.log('ℹ️ Supabase client not initialized. Running in single-player mode.');
      return;
    }

    try {
      // Create a shared multiplayer room channel using Supabase Realtime Broadcast
      this.channel = supabase.channel('kano-drivers-room', {
        config: { broadcast: { self: false } }
      });

      this.channel
        .on('broadcast', { event: 'player_state' }, (payload) => {
          if (onPlayerUpdate && payload.payload) {
            onPlayerUpdate(payload.payload);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log('🟢 Connected to Supabase Realtime Multiplayer!');
          }
        });
    } catch (e) {
      console.warn('⚠️ Supabase Realtime offline, running solo.', e);
    }
  }

  sendPlayerState(position, speed, routeId) {
    if (!this.isConnected || !this.channel) return;

    try {
      this.channel.send({
        type: 'broadcast',
        event: 'player_state',
        payload: {
          driverId: 'driver_' + Math.random().toString(36).substring(2, 7),
          position: { x: position.x, y: position.y, z: position.z },
          speed,
          routeId
        }
      });
    } catch (e) {
      // Fail silently during network drops
    }
  }
}