# راهنمای Build آفلاین

1. پروژه را در Android Studio باز کنید: `android/`
2. صبر کنید Gradle Sync و dependencyها کامل شوند.
3. برای تست: `assembleDebug`
4. برای نسخه Release: `assembleRelease`
5. اگر keystore دارید، Signing را در Android Studio روی release فعال کنید.

## خروجی Release
`android/app/build/outputs/apk/release/app-release.apk` (پس از Build و در صورت فعال بودن signing)

در حالت بدون signing ممکن است فایل با نام `app-release-unsigned.apk` تولید شود. این فایل Release است اما برای انتشار عمومی باید امضا شود.
