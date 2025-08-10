// services/portfolioService.js
import axios from 'axios';

// Ensure cookies/credentials are sent with each request
axios.defaults.withCredentials = true;

export async function fetchPortfolioAndTransactions() {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/profile_analysis`
  );
  return response.data;
}