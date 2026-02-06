import api from './axios';

// ACCESS TOKEN ile zaten girişli kullanıcıya nonce:
export async function getNonce(pubkey) {
  const res = await api.post(`/auth/siws/nonce`, { public_key: pubkey });
  return res.data;
}

// SIWS verify → HttpOnly cookie bırakır
export async function verifySIWS(payload) {
  const res = await api.post(`/auth/siws/verify`, payload);
  return res.data; // { wallet, linked }
}

// SIWS cookie kontrolü (her vitrine girişte)
export async function fetchWalletSession() {
  try {
    const res = await api.get(`/auth/siws/session`);
    return res.data; // { wallet, linked }
  } catch (err) {
    if (err.response?.status === 401) return null;
    throw err;
  }
}

export async function refreshWalletSession() {
  try {
    const res = await api.post(`/auth/siws/refresh`, {});
    return res.data;
  } catch {
    return null;
  }
}

export async function logoutWallet() {
  try {
    await api.post(`/auth/siws/logout`, {});
    return true;
  } catch {
    return false;
  }
}

/* Mevcut login API'ların (fetchMe, logout vs.) aynı kalabilir */
