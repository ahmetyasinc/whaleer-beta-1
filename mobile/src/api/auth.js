import { api } from './client';

export async function loginWithUsername(username, password) {
  // FastAPI tarafı örnek: POST /auth/login -> { access_token, refresh_token, user }
  const { data } = await api.post('/mobile/login', { username, password });
  return data; // { access_token, refresh_token, user }
}

export async function refreshToken(refreshToken) {
  // Örn: POST /auth/refresh -> { access_token, refresh_token? }
  console.log("Refreshing token with", refreshToken);
  const { data } = await api.post('/mobile/refresh', { refresh_token: refreshToken });
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/api/profile');
  return data;
}
