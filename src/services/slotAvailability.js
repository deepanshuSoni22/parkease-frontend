import { Client } from '@stomp/stompjs';
import { APP_CONFIG, resolveWsBase } from '../config/env';

export function buildWebSocketUrl(path = APP_CONFIG.wsPath) {
  return resolveWsBase(APP_CONFIG.apiBase) + path;
}

export function createSlotAvailabilityClient({ onMessage, onDisconnect }) {
  if (!('WebSocket' in window)) {
    return null;
  }

  const client = new Client({
    brokerURL: buildWebSocketUrl(),
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(APP_CONFIG.wsTopicSlotAvailability, (frame) => onMessage(frame.body));
    },
    onWebSocketClose: () => onDisconnect?.(),
    onWebSocketError: () => onDisconnect?.(),
  });

  return {
    connect: async () => {
      client.activate();
      return { client };
    },
    disconnect: () => {
      try {
        client.deactivate();
      } catch {
        // ignore
      }
      onDisconnect?.();
    },
  };
}
