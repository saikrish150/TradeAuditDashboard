/**
 * exchangeRateService.js
 * Fetches latest exchange rates from the Frankfurter API (free/no-key).
 */
export const exchangeRateService = {
  async getUsdToInrRate() {
    try {
      // Switched to open.er-api.com for better CORS support in browser calls
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data.rates.INR || 92.87;
    } catch (error) {
      console.error('Error fetching live USD/INR rate:', error);
      return 92.87; // Fallback to current market rate
    }
  }
};
