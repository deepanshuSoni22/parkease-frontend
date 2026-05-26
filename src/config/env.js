const trimTrailingSlash = (value) => value.replace(/\/$/, '');

const defaultApiBase = import.meta.env.VITE_API_BASE_URL || 'https://parkeasebackend.me';
const defaultLocalApiBase = import.meta.env.VITE_LOCAL_API_BASE_URL || 'http://localhost:8080';

export function resolveApiBase() {
  const configuredBase = import.meta.env.DEV ? defaultLocalApiBase : defaultApiBase;
  return trimTrailingSlash(configuredBase);
}

export function resolveWsBase(apiBase) {
  const base = apiBase || resolveApiBase();
  if (base.startsWith('https://')) return 'wss://' + base.slice('https://'.length);
  if (base.startsWith('http://')) return 'ws://' + base.slice('http://'.length);
  return base;
}

export const APP_CONFIG = {
  apiBase: resolveApiBase(),
  wsPath: import.meta.env.VITE_WS_PATH || '/ws',
  wsTopicSlotAvailability: import.meta.env.VITE_WS_TOPIC_SLOT_AVAILABILITY || '/topic/slot-available',
};
