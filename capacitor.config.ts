import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.aryaei.tools',
  appName: 'ایران آریایی',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // No remote origins are ever whitelisted here — the app is 100% offline.
    allowNavigation: []
  },
  android: {
    allowMixedContent: false,
    captureInput: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0F4C81',
      showSpinner: false
    }
  }
};

export default config;
