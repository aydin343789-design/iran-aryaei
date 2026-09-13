# ایران آریایی — Offline Toolbox 2.0

نسخه حرفه‌ای‌تر اپلیکیشن با رابط کاربری شبیه اپ واقعی، Splash Screen استاندارد Android، دسته‌بندی، جست‌وجو، حالت شب، تنظیمات، اشتراک‌گذاری خروجی، تاریخچه عملیات و ۳۳ ابزار آفلاین.

## قابلیت‌های جدید
- صفحه اصلی داشبوردی با Hero، جست‌وجو و کارت‌های ابزار
- دسته‌بندی‌های زیبا و فیلتر سریع
- نوار پایین: خانه، تاریخچه، تنظیمات
- تنظیمات حالت شب و کارت‌های فشرده
- تاریخچه ۵۰ عملیات اخیر در localStorage
- اشتراک‌گذاری مستقیم فایل خروجی از Android Share Sheet
- ذخیره خروجی و نمایش آخرین خروجی در نوار شناور
- Splash Screen استاندارد با AndroidX SplashScreen
- نام برنامه: «ایران آریایی»
- لوگوی ارسالی کاربر در آیکن، Splash و رابط برنامه
- اجرای ابزارها بدون API، CDN یا سرور آنلاین در زمان اجرا

## ساخت APK Release

پروژه برای Release تنظیم شده است و با Android Studio قابل Build است. در این محیط اجرایی، Android SDK/Gradle و dependency cache کامل در دسترس نبود؛ بنابراین APK را نمی‌توانم صادقانه به‌عنوان «کامپایل‌شده» تحویل بدهم.

در Android Studio پوشه `android/` را باز کنید، سپس: `Build > Generate App Bundles or APKs > Generate APKs` و variant را روی `release` بگذارید. خروجی معمولاً در `android/app/build/outputs/apk/release/` قرار می‌گیرد.

برای انتشار در Google Play یا نصب رسمی، Release باید با keystore خودتان امضا شود. هیچ کلید یا credential ساختگی داخل پروژه قرار داده نشده است.

## ساخت کاملاً آفلاین بعد از آماده شدن cache

بعد از اینکه Android Studio/Gradle و dependencyها یک‌بار دریافت شدند، می‌توانید Build را با حالت offline انجام دهید.

## نکات فنی
- Video compression: AndroidX Media3 Transformer
- HEIC: AndroidX HeifWriter
- Background removal: ML Kit Selfie Segmentation (مناسب سوژه انسانی)
- QR: ZXing + ML Kit
- PDF: Android PdfDocument/PdfRenderer
- Sharing: Android FileProvider + ACTION_SEND

این پروژه از FFmpegKit رسمی استفاده نمی‌کند؛ مسیر ویدئو بر پایه Media3 است.
