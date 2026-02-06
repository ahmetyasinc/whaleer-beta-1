// services/portfolioService.js
import api from '@/api/axios';

// Ensure cookies/credentials are sent with each request
// axios.defaults.withCredentials = true;

export async function fetchPortfolioAndTransactions() {
  const response = await api.get(
    "/profile_analysis"
  );
  return response.data;
}