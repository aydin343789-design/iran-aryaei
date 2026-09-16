# Android / Capacitor 8

این نسخه سورس Android را همراه با Capacitor Android 8 نگه می‌دارد و وب‌اپ آفلاین داخل `app/src/main/assets/public` بسته‌بندی می‌شود.

## Native plugin
`IranAryaeiPlugin` سه ابزار صوتی را فراهم می‌کند:
- برش MP3 با برش فریم‌محور و WAV با برش PCM
- برش قالب‌های سازگار Android با MediaExtractor/MediaMuxer
- فشرده‌سازی به AAC/M4A با MediaCodec
- تبدیل به MP3 در صورت وجود encoder `audio/mpeg` روی دستگاه؛ فایل MP3 ورودی بدون افت کپی می‌شود.
- ذخیره مستقیم خروجی در `Downloads/Iran Aryaei` با MediaStore در Android 10+
- اشتراک‌گذاری با FileProvider

تمام پردازش روی دستگاه انجام می‌شود و فایل صوتی به سرور ارسال نمی‌شود.
