OJEKPROFIT ANDROID - VERSI GITHUB ACTIONS

Isi proyek sudah diletakkan langsung di root repository. Jangan mengunggah folder OjekProfit-Android sebagai satu folder bertingkat; unggah ISI folder ini.

CARA MULAI DARI AWAL
1. Buat repository GitHub baru bernama OjekProfit-Android (atau nama lain).
2. Jika menggunakan halaman upload GitHub, buka repository lalu Add file > Upload files.
3. Buka folder OjekProfit-Android-Clean di komputer, pilih semua ISI folder tersebut termasuk folder .github, app, serta file build.gradle, settings.gradle, gradle.properties.
4. Seret semua isi itu ke halaman upload GitHub. Pastikan .github/workflows/build-apk.yml ikut terunggah.
5. Commit changes ke branch main.
6. Buka tab Actions, pilih Build OjekProfit APK, lalu Run workflow jika belum berjalan otomatis.
7. Jika berhasil, buka run yang hijau dan unduh artifact OjekProfit-debug-APK. Ekstrak ZIP untuk mendapatkan app-debug.apk.

CATATAN
- Build menggunakan GitHub Actions, jadi komputer tidak perlu Android Studio.
- APK ini adalah debug APK untuk pemasangan/pengujian pribadi.
- Aplikasi memuat halaman dari assets lokal dan penyimpanan web lokal, jadi fitur utamanya dirancang berjalan offline.
