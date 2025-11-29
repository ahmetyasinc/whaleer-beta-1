// auth.js
import axios from "axios";
const API = process.env.NEXT_PUBLIC_API_URL;

// Stellar için Verify fonksiyonu
export async function verifyStellar(payload) {
  // payload: { publicKey, signature, nonce, message }
  const res = await axios.post(`${API}/auth/siws/verify-stellar`, payload, { withCredentials: true });
  return res.data;
}

// ACCESS TOKEN ile zaten girişli kullanıcıya nonce:
export async function getNonce(pubkey) {
  const res = await axios.post(`${API}/auth/siws/nonce`, { public_key: pubkey }, { withCredentials: true });
  return res.data;
}

// SIWS verify → HttpOnly cookie bırakır
export async function verifySIWS(payload) {
  const res = await axios.post(`${API}/auth/siws/verify`, payload, { withCredentials: true });
  return res.data; // { wallet, linked }
}

// SIWS cookie kontrolü (her vitrine girişte)
export async function fetchWalletSession() {
  try {
    const res = await axios.get(`${API}/auth/siws/session`, { withCredentials: true });
    return res.data; // { wallet, linked }
  } catch (err) {
    if (err.response?.status === 401) return null;
    throw err;
  }
}

export async function refreshWalletSession() {
  try {
    const res = await axios.post(`${API}/auth/siws/refresh`, {}, { withCredentials: true });
    return res.data;
  } catch {
    return null;
  }
}

export async function logoutWallet() {
  try {
    await axios.post(`${API}/auth/siws/logout`, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

/* Mevcut login API'ların (fetchMe, logout vs.) aynı kalabilir */
