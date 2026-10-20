export class RedisSyncManager {
  constructor(wsEndpoint) {
    this.socket = null;
    // Prevent defaulting to a non-existent placeholder URL
    this.endpoint = wsEndpoint || '';
  }

  connect(onPlayerUpdate) {
    if (!this.endpoint || this.endpoint.includes('your-redis-sync-server')) {
      console.log('ℹ️ Redis sync server endpoint not configured. Running in single-player mode.');
      return;
    }

    try {
      this.socket = new WebSocket(this.endpoint);
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (onPlayerUpdate) onPlayerUpdate(data);
      };
      this.socket.onerror = (e) => {
        console.warn('Redis sync server offline. Running in single-player mode.');
      };
    } catch (e) {
      console.warn('Redis sync server offline. Running in single-player mode.', e);
    }
  }

  sendPlayerState(position, speed, routeId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'UPDATE_POS', position, speed, routeId }));
    }
  }
}