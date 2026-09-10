# 7 Kebiasaan Anak Indonesia Hebat — UPTD SMPN 11 SINJAI

Website pendataan harian 7 Kebiasaan Anak Indonesia Hebat dengan:
- Orang tua/wali mengisi tanpa login.
- Guru hanya melihat kelas yang ditugaskan.
- Admin mengelola akun guru/admin, reset password, dan penugasan kelas.
- Rekap harian dan bulanan.
- Export Excel dan print.
- Penghapusan data bermasalah oleh guru/admin.
- Supabase Auth + Postgres + Row Level Security.

## Stack
Next.js 16.3.3, React 19.2, Supabase, Vercel, GitHub, SheetJS.

## A. Siapkan Supabase
1. Buat satu project Supabase.
2. Buka **SQL Editor**.
3. Salin seluruh isi `supabase/schema.sql`, lalu jalankan.
4. Buka **Authentication → Users → Add user** dan buat akun admin pertama dengan email teknis seperti `admin@akun.smpn11.local`, password kuat, lalu aktifkan/konfirmasi user tersebut.
5. Salin **User UID** admin pertama.
6. Di SQL Editor jalankan:
   `insert into public.profiles(id,username,display_name,role) values('UUID_ADMIN','admin','Administrator','admin');`
7. Buka **Connect** / API Keys dan catat Project URL dan Publishable Key.
8. Ambil **Service Role Key** dari API Keys. Simpan hanya sebagai environment variable server, jangan pernah diberi prefix `NEXT_PUBLIC_`.

## B. Environment Variables
Di Vercel → Project → Settings → Environment Variables, buat:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Jangan commit `.env.local` ke GitHub.

## C. GitHub dari tablet Android
Cara paling sederhana adalah memakai GitHub melalui browser:
1. Buat repository kosong, misalnya `7-kebiasaan-smpn11`.
2. Upload seluruh isi folder proyek ini menggunakan **Add file → Upload files**.
3. Pastikan `package.json`, folder `app`, `lib`, dan `supabase` ikut ter-upload.

## D. Deploy Vercel
1. Buka Vercel dan pilih **Add New → Project**.
2. Hubungkan repository GitHub tadi.
3. Vercel akan mengenali Next.js.
4. Tambahkan 3 environment variables seperti bagian B.
5. Klik Deploy.
6. Setelah berhasil, buka URL Vercel. Homepage langsung menampilkan matrix pengisian.

## E. Login
- Guru: `/login?role=guru`
- Admin: `/login?role=admin`

Format username guru/admin adalah username yang dibuat dari dashboard admin. Sistem secara internal mengubah username menjadi email teknis `username@akun.smpn11.local` agar kompatibel dengan Supabase Auth; pengguna tetap cukup mengetik username + password.

## Catatan keamanan
- Data pendataan tidak dapat dibaca publik walaupun form publik bisa mengirim data.
- Guru dibatasi berdasarkan `class_name` pada profil melalui RLS.
- Operasi membuat/menghapus akun Auth menggunakan Service Role Key hanya pada route server.
- Jika data siswa sudah pernah dikirim untuk tanggal + kelas + nama yang sama, pengiriman kedua ditolak agar tidak membuat duplikasi. Koreksi dapat dilakukan guru/admin dengan menghapus entri bermasalah lalu meminta pengisian kembali.

## Catatan pengembangan lanjutan
Tahap berikut yang sangat disarankan untuk penggunaan sekolah dalam skala besar adalah **Master Data Siswa + kode unik siswa/QR**, sehingga orang tua tidak perlu mengetik nama siswa dan sistem dapat meminimalkan salah eja/duplikasi nama.
