/**
 * Multiplayer sync – fully optional. Never blocks single-player.
 */
export class RedisSyncManager {
  constructor() {
    this.channel = null;
    this.isConnected = false;
  }

  connect(onPlayerUpdate) {
    // Intentionally no-op unless you later wire real Supabase keys
    console.log('ℹ️ Multiplayer sync in single-player fallback mode');
  }

  sendPlayerState() {
    // no-op
  }
}
