// services/authStorage.js
import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'whaleer.refresh_token';
const SERVICE = 'whaleer.keychain'; // tek yerden kullan

export async function saveRefreshToken(token) {
  if (!token) return;
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token, { keychainService: SERVICE });
  } catch (e) {
    console.log('saveRefreshToken error:', e?.message);
  }
}

export async function getRefreshToken() {
  try {
    // iOS için set ettiğin service ile oku
    return await SecureStore.getItemAsync(REFRESH_KEY, { keychainService: SERVICE });
  } catch (e) {
    console.log('getRefreshToken error:', e?.message);
    return null;
  }
}

export async function clearRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY, { keychainService: SERVICE });
  } catch (e) {
    console.log('clearRefreshToken error:', e?.message);
  }
}
