# Iran Aryaei

اپلیکیشن چندسکویی مبتنی بر وب و Android با ساختار Capacitor. این مخزن کد وب، پیکربندی Android و تست‌های پروژه را در یک ساختار قابل توسعه نگهداری می‌کند.

## ساختار

- `www/`: رابط وب و assetهای برنامه
- `android/`: پروژهٔ Android تولیدشده با Capacitor
- `tests/`: تست‌های پروژه
- `capacitor.config.ts`: پیکربندی Capacitor
- `.github/`: workflowهای خودکارسازی

## شروع توسعه

```bash
npm install
npm run build
npx cap sync android
```

برای باز کردن پروژهٔ Android:

```bash
npx cap open android
```

## تست

دستورهای تست در `package.json` و پوشهٔ `tests/` تعریف شده‌اند. پس از تغییر رابط وب، ابتدا build و سپس sync را اجرا کنید تا assetهای Android به‌روز شوند.

## وضعیت

این پروژه در حال توسعه است. برای ساخت نسخهٔ release، امضای Android، نسخهٔ Capacitor و تنظیمات محیط انتشار را قبل از انتشار نهایی بررسی کنید.
