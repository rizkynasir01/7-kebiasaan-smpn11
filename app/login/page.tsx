'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SCHOOL } from '@/lib/constants';

function LoginContent() {
  const sp = useSearchParams();
  const role = sp.get('role') === 'admin' ? 'admin' : 'guru';

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

    location.href = role === 'admin' ? '/admin' : '/guru';
  }

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-hero">
          <div className="logo">7K</div>

          <h1>
            {role === 'admin' ? 'Portal Administrator' : 'Portal Guru'}
          </h1>

          <p className="muted" style={{ fontSize: 13 }}>
            {SCHOOL}
          </p>
        </div>

        <div className="notice" style={{ marginBottom: 18 }}>
          {role === 'admin'
            ? 'Kelola seluruh data, akun, dan penugasan kelas.'
            : 'Pantau rekap kebiasaan siswa sesuai kelas yang ditugaskan.'}
        </div>

        <label>Username</label>

        <input
          autoCapitalize="none"
          value={u}
          onChange={(x) => setU(x.target.value)}
          placeholder={role === 'admin' ? 'admin' : 'nama.pengguna'}
        />

        <div style={{ marginTop: 14 }}>
          <label>Password</label>

          <input
            type="password"
            value={p}
            onChange={(x) => setP(x.target.value)}
            onKeyDown={(x) => x.key === 'Enter' && go()}
            placeholder="Masukkan password"
          />
        </div>

        {e && (
          <div className="error" style={{ marginTop: 14 }}>
            {e}
          </div>
        )}

        <button
          className="btn primary"
          style={{ width: '100%', marginTop: 16 }}
          disabled={loading}
          onClick={go}
        >
          {loading ? '⏳ Memeriksa...' : '🔐 Masuk ke Dashboard'}
        </button>

        <a
          href="/"
          className="btn"
          style={{ width: '100%', marginTop: 9 }}
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
            <div className="notice">Memuat halaman login...</div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
