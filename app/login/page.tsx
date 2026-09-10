'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SCHOOL } from '@/lib/constants';

function LoginContent() {
  const sp = useSearchParams();
  const roleParam = sp.get('role');

  const role =
    roleParam === 'admin'
      ? 'admin'
      : roleParam === 'wali_kelas'
        ? 'wali_kelas'
        : 'guru_wali';

  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [e, setE] = useState('');
  const [loading, setLoading] = useState(false);

  async function go() {
    if (!u || !p) {
      return setE('Username dan password wajib diisi.');
    }

    setLoading(true);
    setE('');

    const email = `${u.trim().toLowerCase()}@akun.smpn11.local`;

    const { error } = await createClient().auth.signInWithPassword({
      email,
      password: p,
    });

    setLoading(false);

    if (error) {
      return setE('Username atau password salah.');
    }

    // Arahkan pengguna sesuai jenis akun.
    if (role === 'admin') {
      location.href = '/admin';
    } else {
      location.href = '/guru';
    }
  }

  return (
    <div className="login">
      <div className="login-card card">

        {/* HEADER LOGIN */}
        <div className="login-hero">
          <div className="logo">7K</div>

          <h1>
            {role === 'admin'
              ? 'Portal Administrator'
              : role === 'wali_kelas'
                ? 'Portal Wali Kelas'
                : 'Portal Guru Wali'}
          </h1>

          <p className="muted" style={{ fontSize: 13 }}>
            {SCHOOL}
          </p>
        </div>

        {/* INFORMASI ROLE */}
        <div
          className="notice"
          style={{ marginBottom: 18 }}
        >
          {role === 'admin'
            ? 'Kelola seluruh data, akun, dan penugasan kelas.'
            : role === 'wali_kelas'
              ? 'Pantau dan kelola rekap kebiasaan siswa sesuai kelas yang ditugaskan.'
              : 'Pantau rekap kebiasaan siswa sesuai tugas guru wali.'}
        </div>

        {/* USERNAME */}
        <label>Username</label>

        <input
          autoCapitalize="none"
          autoComplete="username"
          value={u}
          onChange={(x) => setU(x.target.value)}
          placeholder={
            role === 'admin'
              ? 'admin'
              : 'nama.pengguna'
          }
        />

        {/* PASSWORD */}
        <div style={{ marginTop: 14 }}>
          <label>Password</label>

          <input
            type="password"
            autoComplete="current-password"
            value={p}
            onChange={(x) => setP(x.target.value)}
            onKeyDown={(x) => {
              if (x.key === 'Enter') {
                go();
              }
            }}
            placeholder="Masukkan password"
          />
        </div>

        {/* ERROR */}
        {e && (
          <div
            className="error"
            style={{ marginTop: 14 }}
          >
            {e}
          </div>
        )}

        {/* LOGIN BUTTON */}
        <button
          className="btn primary"
          style={{
            width: '100%',
            marginTop: 16,
          }}
          disabled={loading}
          onClick={go}
        >
          {loading
            ? '⏳ Memeriksa...'
            : '🔐 Masuk ke Dashboard'}
        </button>

        {/* BACK BUTTON */}
        <a
          href="/"
          className="btn"
          style={{
            width: '100%',
            marginTop: 9,
          }}
        >
          ← Kembali ke Beranda
        </a>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="login">
          <div className="login-card card">
            <div className="notice">
              Memuat halaman login...
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}