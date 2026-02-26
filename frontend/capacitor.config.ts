import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tallydrop.app',
  appName: 'Tally Drop 落记',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  server: {
    // Allow mixed content if your API is HTTP during dev; use HTTPS in production
    // androidScheme: 'https',
  },
};

export default config;
