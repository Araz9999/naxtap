export const backendConfig = {
  PAYRIFF_MERCHANT_ID: process.env.PAYRIFF_MERCHANT_ID || '',
  PAYRIFF_SECRET_KEY: process.env.PAYRIFF_SECRET_KEY || '',
  PAYRIFF_BASE_URL: process.env.PAYRIFF_BASE_URL || 'https://api.payriff.com',
  FRONTEND_URL:
    process.env.FRONTEND_URL ||
    process.env.EXPO_PUBLIC_FRONTEND_URL ||
    'https://1r36dhx42va8pxqbqz5ja.rork.app',
};

export default backendConfig;


