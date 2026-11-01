/**
 * Capacitor configuration for the integrated native Android app «ایران آریایی».
 * راهنمای کامل فارسی در فایل ANDROID.md آمده است.
 */
const config = {
  appId: "ir.aryaei.tools",
  appName: "ایران آریایی",
  webDir: "out",
  backgroundColor: "#06090e",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
