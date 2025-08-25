// src/api/showcase.js
import api from "./client"; // axios instance

const BASE = "/mobile";

export async function fetchShowcase(payload) {
  // payload içinde limit, filtreler vs. var
  const { data } = await api.post(`${BASE}/showcase/newdata`, payload || {});
  return data; // beklenen: [] (5 bot)
}

export async function followBot(bot_id) {
  const { data } = await api.post(`${BASE}/bot/follow`, { bot_id });
  return data;
}
