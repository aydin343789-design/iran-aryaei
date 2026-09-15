# ساخت APK با گوشی و GitHub

1. همه فایل‌های این پوشه را در ریشه Repository قرار بده.
2. در GitHub وارد Actions شو.
3. Workflow با نام `Build Iran Aryaei APK` را اجرا کن.
4. صبر کن تا مراحل Node، Android SDK، Capacitor و Gradle سبز شوند.
5. از بخش Artifacts فایل `iran-aryaei-release-apk` را دانلود کن.

این پروژه برای Build از Android SDK 36، Java 17، Gradle 9.1 و Capacitor 8.5 استفاده می‌کند.

برای اولین Build اینترنت GitHub Actions لازم است تا dependencyهای Gradle و npm دریافت شوند. بعد از Build، خود APK هنگام اجرا به اینترنت نیاز ندارد.

نسخه 5.0 شامل 34 ابزار است و پردازش صوت و ویدئو برای ابزارهای اصلی با FFmpegKit Maintained به‌صورت local انجام می‌شود.
