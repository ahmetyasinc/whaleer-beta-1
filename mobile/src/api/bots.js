// src/api/bots.js
import api from "./client";

// GET /mobile/bots/{bot_id}/analysis
export async function getBotAnalysis(botId) {
  if (!botId && botId !== 0) throw new Error("botId is required");
  const { data } = await api.get(`/mobile/bots/${botId}/analysis`);
  return data;
}
