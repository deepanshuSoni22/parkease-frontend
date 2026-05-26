import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { APP_CONFIG } from '../config/env';

export function buildSockJsUrl(path = APP_CONFIG.wsPath) {
  // SockJS requires plain http/https URL (not ws/wss) — it manages the
  // WebSocket upgrade internally after the SockJS handshake.
  return APP_CONFIG.apiBase + path;
}

function getXsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function createSlotAvailabilityClient({ onMessage, onDisconnect }) {
  if (!('WebSocket' in window)) {
    return null;
  }

  const token = getXsrfToken();

  const client = new Client({
    // Backend uses .withSockJS() so we must use the SockJS factory.
    // The 403 error was caused by localhost:5173 not being in the backend's
    // setAllowedOrigins() list — fixed by adding it there.
    webSocketFactory: () => new SockJS(buildSockJsUrl()),
    connectHeaders: token ? { 'X-XSRF-TOKEN': token } : {},
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

