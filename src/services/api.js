import { APP_CONFIG } from '../config/env';

export function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildHeaders(method, isForm = false) {
  const headers = {};
  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    const token = getCsrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }

  return headers;
}

async function request(method, path, body, options = {}) {
  const response = await fetch(APP_CONFIG.apiBase + path, {
    method,
    credentials: 'include',
    headers: buildHeaders(method, Boolean(options.form)),
    body: body == null ? undefined : options.form ? body : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data || response.statusText);
  }

  return data;
}

export const api = {
  request,
  get: (path) => request('GET', path),
  post: (path, body, options) => request('POST', path, body, options),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  health: () => fetch(APP_CONFIG.apiBase + '/api/v1/health', { credentials: 'include' }),
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return request('POST', '/api/v1/auth/login', params.toString(), { form: true });
  },
};
