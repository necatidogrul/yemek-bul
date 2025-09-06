// Legal Documents Configuration
// These URLs should point to your actual privacy policy and terms of service

export const LEGAL_URLS = {
  // Privacy Policy URLs
  privacyPolicy: {
    tr: 'https://necatidogrul.dev/tr/cook-ai', // Turkish Privacy Policy
    en: 'https://necatidogrul.dev/en/cook-ai', // English Privacy Policy
  },

  // Terms of Service URLs
  termsOfService: {
    tr: 'https://necatidogrul.dev/tr/cook-ai', // Turkish Terms of Service
    en: 'https://necatidogrul.dev/en/cook-ai', // English Terms of Service
  },

  // Support & Contact
  support: {
    email: 'destek@yemekbulai.com',
    website: 'https://yemekbulai.com/destek',
  },

  // App Store URLs
  appStore: {
    ios: 'https://apps.apple.com/app/yemekbulai/id123456789', // Replace with actual App ID
    android:
      'https://play.google.com/store/apps/details?id=com.yemekbulucuai.app',
  },

  // Developer Info
  developer: {
    website: 'https://necatidogrul.dev',
    email: 'necatidogrul7@gmail.com',
  },

  // KVKK (Turkish Data Protection Law)
  kvkk: {
    tr: 'https://yemekbulai.com/kvkk-aydinlatma-metni',
  },

  // Cookie Policy
  cookiePolicy: {
    tr: 'https://yemekbulai.com/cerez-politikasi',
    en: 'https://yemekbulai.com/cookie-policy',
  },
};

// Helper function to get URL based on language
export const getLegalUrl = (
  type: 'privacyPolicy' | 'termsOfService' | 'kvkk' | 'cookiePolicy',
  language: 'tr' | 'en' = 'tr'
): string => {
  const urls = LEGAL_URLS[type];

  if (type === 'kvkk' && language === 'en') {
    // KVKK is Turkish-specific, redirect to privacy policy for English
    return LEGAL_URLS.privacyPolicy.en;
  }

  return urls[language as keyof typeof urls] || urls.tr || '';
};

// Get support email with subject
export const getSupportEmailUrl = (
  subject: string = 'YemekbulAI - Destek',
  language: 'tr' | 'en' = 'tr'
): string => {
  const email = LEGAL_URLS.support.email;
  const body =
    language === 'tr'
      ? 'Merhaba,%0A%0ALütfen sorunuzu detaylıca açıklayınız:%0A%0A'
      : 'Hello,%0A%0APlease describe your issue in detail:%0A%0A';

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
};

// Get App Store URL based on platform
export const getAppStoreUrl = (platform: 'ios' | 'android' = 'ios'): string => {
  return LEGAL_URLS.appStore[platform];
};
