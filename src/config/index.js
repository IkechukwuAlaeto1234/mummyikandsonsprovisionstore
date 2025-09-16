// Environment configuration
export const config = {
  development: {
    API_BASE_URL: 'http://localhost:3001/api',
    PAYSTACK_PUBLIC_KEY: 'pk_test_your_paystack_public_key',
    FLUTTERWAVE_PUBLIC_KEY: 'FLWPUBK_TEST-your_flutterwave_public_key',
    ENABLE_LOGGING: true,
    CACHE_TTL: 300000, // 5 minutes
  },
  production: {
    API_BASE_URL: 'https://api.mummyikandsons.com',
    PAYSTACK_PUBLIC_KEY: 'pk_live_your_paystack_public_key',
    FLUTTERWAVE_PUBLIC_KEY: 'FLWPUBK-your_flutterwave_public_key',
    ENABLE_LOGGING: false,
    CACHE_TTL: 3600000, // 1 hour
  },
};

// Nigerian-specific configuration
export const nigerianConfig = {
  currency: {
    code: 'NGN',
    symbol: '₦',
    locale: 'en-NG',
  },
  regions: [
    { name: 'Lagos', deliveryFee: 1500, estimatedDays: 1 },
    { name: 'Abuja', deliveryFee: 2000, estimatedDays: 2 },
    { name: 'Port Harcourt', deliveryFee: 2500, estimatedDays: 2 },
    { name: 'Kano', deliveryFee: 3000, estimatedDays: 3 },
    { name: 'Ibadan', deliveryFee: 1800, estimatedDays: 1 },
    { name: 'Benin City', deliveryFee: 2200, estimatedDays: 2 },
  ],
  languages: ['en', 'pidgin', 'ha', 'yo', 'ig'],
  paymentMethods: [
    'paystack',
    'flutterwave',
    'bank_transfer',
    'ussd',
    'pay_on_delivery',
  ],
  logistics: {
    gig: {
      baseUrl: 'https://api.gig.ng',
      maxWeight: 50, // kg
    },
    jumia: {
      baseUrl: 'https://api.jumia.com.ng',
      maxWeight: 30, // kg
    },
  },
};

// Get current environment config
const env = (typeof process !== 'undefined' ? process.env.NODE_ENV : null) || 'development';
export const currentConfig = config[env];
