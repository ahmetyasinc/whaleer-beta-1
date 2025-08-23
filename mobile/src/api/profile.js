// src/api/profile.js
import api from "./client";

export async function fetchMobileProfile() {
  console.log("Fetching mobile profile...");
  const res = await api.get("/mobile/profile");

  return res.data; // { ok, user, apis, indicators, strategies }
}
