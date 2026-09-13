# ساخت APK فقط با گوشی و GitHub

این پروژه برای این آماده شده که بدون Android Studio و فقط از داخل مرورگر گوشی، روی GitHub قرار بگیرد و GitHub Actions فایل APK را بسازد.

## 1) ساخت Repository

یک Repository جدید در GitHub بسازید، مثلاً:

`iran-aryaei`

سپس تمام فایل‌های همین پروژه را در ریشه Repository آپلود کنید. پوشه `.github/workflows` را هم حتماً نگه دارید.

## 2) اجرای Build

در GitHub وارد:

`Actions → Build Iran Aryaei APK`

شوید و `Run workflow` را بزنید.

Workflow به صورت خودکار Node.js، Java، Android SDK و Gradle را آماده می‌کند، وابستگی‌های npm را نصب می‌کند، Capacitor را Sync می‌کند و `assembleRelease` را اجرا می‌کند.

## 3) دریافت APK

بعد از سبز شدن Workflow:

`Actions → اجرای موفق → Artifacts → iran-aryaei-release-apk`

فایل ZIP را دانلود کنید و APK داخل آن را از حالت فشرده خارج کنید.

## 4) نکته مهم درباره Release

این Build یک APK Release **unsigned** می‌سازد تا به‌راحتی و بدون نگهداری کلید خصوصی داخل GitHub ساخته شود. برای نصب تستی روی گوشی، در صورت نیاز می‌توانید از Debug workflow استفاده کنید.

برای انتشار در Google Play یا توزیع حرفه‌ای، باید APK با keystore شخصی شما امضا شود. هیچ رمز یا keystore داخل این Repository قرار ندهید.

## 5) Build خودکار

Workflow مربوط به Release با Push روی `main`/`master` و همچنین دستی اجرا می‌شود. Workflow Debug فقط دستی اجرا می‌شود.

## 6) نکته درباره آفلاین بودن خود برنامه

«کاملاً آفلاین» یعنی بعد از نصب، ابزارهای برنامه برای اجرای عملیات عادی به API، سرور یا CDN نیاز ندارند. خود فرایند Build در GitHub برای دریافت dependencyها به اینترنت GitHub Actions نیاز دارد.
