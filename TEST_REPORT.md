# گزارش تست نسخه Final Candidate

## وضعیت
- JavaScript syntax check: PASS
- تعداد ابزارها: 33/33
- برای هر ابزار فرم ورودی و مسیر اجرای JS وجود دارد: PASS
- JSONهای محلی: PASS
- بانک شهرها: 166 رکورد با مختصات معتبر: PASS
- دیکشنری دوطرفه: 980 رکورد یکتا با `en` و `fa`: PASS
- Intent mapping: 33/33: PASS
- Bridgeهای Native مورد استفاده JS با متدهای Java تطبیق داده شدند: PASS
- وابستگی runtime خارجی در `www/`: PASS (فقط URL نمونه برای QR)
- بررسی ساختار braces/parentheses فایل Java: PASS

## ابزارهای Native
26. برش صوت — MediaExtractor/MediaMuxer و برش WAV/MP3
27. فشرده‌سازی صدا — decode/encode AAC + M4A
28. صدا به MP3 — encoder داخلی دستگاه؛ MP3 ورودی بدون بازرمزگذاری
29. فشرده‌سازی ویدئو — H.264/AAC با MediaCodec/MediaMuxer در دستگاه‌های سازگار
30. تصویر به HEIC — Android 10+ و HEIC encoder دستگاه
31. HEIC به JPG — ImageDecoder / JPEG
32. حذف پس‌زمینه — الگوریتم آفلاین برای پس‌زمینه‌های ساده و یکنواخت؛ جایگزین مدل segmentation نیست
33. PDF به تصاویر — PdfRenderer؛ خروجی ZIP شامل همه صفحات

## ذخیره و اشتراک‌گذاری
تمام خروجی‌هایی که از Bridge Native عبور می‌کنند در `Downloads/Iran Aryaei` با MediaStore در Android 10+ ذخیره می‌شوند. خروجی‌های JS نیز در صورت در دسترس بودن Bridge از همین مسیر ذخیره می‌شوند و fallback مرورگر دارند.

## محدودیت تست محیط توسعه
در این محیط Android SDK/Gradle dependency cache کامل در دسترس نبود؛ بنابراین APK واقعی روی emulator/دستگاه در این محیط ساخته و اجرا نشد. بررسی syntax و اتصال متدهای JS/Java و داده‌های محلی انجام شد. GitHub Actions پروژه برای build واقعی تنظیم شده است.
