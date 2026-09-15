'use client';

import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { createClient } from '@/lib/supabase/client';
import { KEBIASAAN } from '@/lib/constants';

type Profile = {
  id: string;
  display_name: string | null;
  username?: string | null;
  role: string | null;
  class_name: string | null;
  assignment?: string | null;
};

type DailyRecord = {
  id: string;
  record_date: string;
  student_name: string;
  student_class: string;
  parent_name: string | null;

  bangun_pagi?: boolean | null;
  beribadah?: boolean | null;
  berolahraga?: boolean | null;
  makan_sehat?: boolean | null;
  gemar_belajar?: boolean | null;
  bermasyarakat?: boolean | null;
  tidur_cepat?: boolean | null;

  [key: string]: unknown;
};

const sb = createClient();

const KEBIASAAN_KEYS = [
  'bangun_pagi',
  'beribadah',
  'berolahraga',
  'makan_sehat',
  'gemar_belajar',
  'bermasyarakat',
  'tidur_cepat',
] as const;

const KEBIASAAN_LABELS: Record<string, string> = {
  bangun_pagi: 'Bangun Pagi',
  beribadah: 'Beribadah',
  berolahraga: 'Berolahraga',
  makan_sehat: 'Makan Sehat & Bergizi',
  gemar_belajar: 'Gemar Belajar',
  bermasyarakat: 'Bermasyarakat',
  tidur_cepat: 'Tidur Cepat',
};

function formatDate(date: string) {
  if (!date) return '-';

  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function todayString() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Makassar',
  });
}

function getMonthString(date: string) {
  return date.slice(0, 7);
}

export default function Guru() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /*
   * PENTING:
   * Jangan menentukan tanggal dengan new Date() pada render server.
   * Nilai tanggal baru dibuat setelah browser/client siap.
   */
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState('');

  const [tab, setTab] = useState<'overview' | 'records'>('overview');
  const [period, setPeriod] = useState<'harian' | 'bulanan'>('harian');

  const [search, setSearch] = useState('');

  // =========================================================
  // MEMUAT PROFIL GURU
  // =========================================================

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      /*
       * Gunakan getSession() terlebih dahulu.
       * Ini lebih stabil untuk halaman client ketika session
       * browser sedang dipulihkan.
       */
      const {
        data: { session },
        error: sessionError,
      } = await sb.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
      }

      if (!session?.user) {
        window.location.href = '/login?role=guru';
        return;
      }

      const user = session.user;

      const { data, error: profileError } = await sb
        .from('profiles')
        .select(
          'id, display_name, username, role, class_name, assignment'
        )
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        setError('Profil pengguna tidak ditemukan.');
        return;
      }

      // Jika admin mencoba masuk halaman guru,
      // arahkan kembali ke dashboard admin.
      if (data.role === 'admin') {
        window.location.href = '/admin';
        return;
      }

      // Halaman guru hanya untuk guru/wali kelas.
      if (
        data.role !== 'guru_wali' &&
        data.role !== 'wali_kelas'
      ) {
        setError(
          'Akun ini tidak memiliki akses ke Dashboard Guru.'
        );
        return;
      }

      setProfile(data as Profile);
    } catch (err: any) {
      console.error(
        'Gagal memuat profil guru:',
        err
      );

      if (
        err?.message
          ?.toLowerCase?.()
          .includes('auth session missing') ||
        err?.message
          ?.toLowerCase?.()
          .includes('jwt')
      ) {
        window.location.href = '/login?role=guru';
        return;
      }

      setError(
        err?.message ||
          'Gagal memuat profil pengguna.'
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // MEMUAT DATA HANYA UNTUK KELAS GURU
  // =========================================================

  async function loadRecords() {
    if (!profile) return;

    setLoadingRecords(true);
    setError('');

    try {
      /*
       * PENTING:
       * Kelas TIDAK diambil dari input pengguna.
       * Kelas selalu diambil dari profiles.class_name.
       */
      const assignedClass =
        profile.class_name?.trim();

      if (!assignedClass) {
        setRecords([]);

        setError(
          'Akun Anda belum mendapatkan penugasan kelas. Silakan hubungi Administrator.'
        );

        return;
      }

      let query = sb
        .from('daily_records')
        .select('*')
        .eq('student_class', assignedClass);

      // =====================================================
      // FILTER HARIAN
      // =====================================================

      if (period === 'harian') {
        query = query.eq(
          'record_date',
          date
        );
      }

      // =====================================================
      // FILTER BULANAN
      // =====================================================

      else {
        const month =
          getMonthString(date);

        const firstDay =
          `${month}-01`;

        const year =
          Number(month.slice(0, 4));

        const monthNumber =
          Number(month.slice(5, 7));

        const lastDayDate =
          new Date(
            Date.UTC(
              year,
              monthNumber,
              0
            )
          );

        const lastDay =
          String(
            lastDayDate.getUTCDate()
          ).padStart(2, '0');

        const lastDayString =
          `${month}-${lastDay}`;

        query = query
          .gte(
            'record_date',
            firstDay
          )
          .lte(
            'record_date',
            lastDayString
          );
      }

      // =====================================================
      // AMBIL DATA
      // =====================================================

      const {
        data,
        error: recordError,
      } = await query
        .order(
          'record_date',
          {
            ascending: false,
          }
        )
        .order(
          'student_name',
          {
            ascending: true,
          }
        )
        .limit(10000);

      if (recordError) {
        throw recordError;
      }

      setRecords(
        (data || []) as DailyRecord[]
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          'Gagal memuat data pendataan.'
      );

      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }

  // =========================================================
  // CLIENT MOUNT
  // =========================================================

  useEffect(() => {
    /*
     * Ini adalah perbaikan utama untuk Hydration failed.
     *
     * Server tidak langsung menghitung tanggal.
     * Setelah browser siap, barulah tanggal dibuat.
     */
    setMounted(true);
    setDate(todayString());

    loadProfile();
  }, []);

  // =========================================================
  // LOAD DATA SETELAH PROFILE DAN TANGGAL SIAP
  // =========================================================

  useEffect(() => {
    if (
      mounted &&
      profile &&
      date
    ) {
      loadRecords();
    }
  }, [
    mounted,
    profile,
    date,
    period,
  ]);

  // =========================================================
  // FILTER PENCARIAN
  // =========================================================

  const filteredRecords =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return records;
      }

      return records.filter(
        (record) => {
          const studentName =
            String(
              record.student_name ||
                ''
            ).toLowerCase();

          const studentClass =
            String(
              record.student_class ||
                ''
            ).toLowerCase();

          const parentName =
            String(
              record.parent_name ||
                ''
            ).toLowerCase();

          return (
            studentName.includes(q) ||
            studentClass.includes(q) ||
            parentName.includes(q)
          );
        }
      );
    }, [
      records,
      search,
    ]);

  // =========================================================
  // DAFTAR SISWA UNIK
  // =========================================================

  const students =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            student_name: string;
            student_class: string;
            parent_name: string;
          }
        >();

      records.forEach(
        (record) => {
          const key =
            `${record.student_name}|${record.student_class}`;

          if (!map.has(key)) {
            map.set(
              key,
              {
                student_name:
                  record.student_name,

                student_class:
                  record.student_class,

                parent_name:
                  record.parent_name ||
                  '-',
              }
            );
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.student_name.localeCompare(
            b.student_name,
            'id'
          )
      );
    }, [records]);

  // =========================================================
  // STATISTIK 7 KEBIASAAN
  // =========================================================

  const stats =
    useMemo(() => {
      const result:
        Record<
          string,
          {
            yes: number;
            total: number;
            percentage: number;
          }
        > = {};

      KEBIASAAN_KEYS.forEach(
        (key) => {
          let yes = 0;
          let total = 0;

          records.forEach(
            (record) => {
              const value =
                record[key];

              if (
                value !== null &&
                value !== undefined
              ) {
                total++;

                if (
                  value === true
                ) {
                  yes++;
                }
              }
            }
          );

          result[key] = {
            yes,
            total,
            percentage: total
              ? Math.round(
                  (yes / total) *
                    100
                )
              : 0,
          };
        }
      );

      return result;
    }, [records]);

  const totalData =
    records.length;

  const totalStudents =
    students.length;

  const totalDone =
    KEBIASAAN_KEYS.reduce(
      (sum, key) =>
        sum + stats[key].yes,
      0
    );

  const totalPossible =
    KEBIASAAN_KEYS.reduce(
      (sum, key) =>
        sum + stats[key].total,
      0
    );

  const averagePercentage =
    totalPossible
      ? Math.round(
          (totalDone /
            totalPossible) *
            100
        )
      : 0;

  // =========================================================
  // EXPORT CSV / EXCEL
  // =========================================================

  function exportExcel() {
    if (
      !filteredRecords.length
    ) {
      setMessage(
        'Tidak ada data untuk diekspor.'
      );

      return;
    }

    const headers = [
      'Tanggal',
      'Nama Siswa',
      'Kelas',
      'Orang Tua/Wali',

      ...KEBIASAAN_KEYS.map(
        (key) =>
          KEBIASAAN_LABELS[key]
      ),
    ];

    const rows =
      filteredRecords.map(
        (record) => [
          record.record_date,
          record.student_name,
          record.student_class,
          record.parent_name ||
            '',

          ...KEBIASAAN_KEYS.map(
            (key) => {
              const value =
                record[key];

              if (
                value === true
              ) {
                return 'Ya';
              }

              if (
                value === false
              ) {
                return 'Tidak';
              }

              return (
                value ?? ''
              );
            }
          ),
        ]
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map(
        (row) =>
          row
            .map((cell) => {
              const value =
                String(
                  cell ?? ''
                );

              return `"${value.replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(',')
      )
      .join('\n');

    const blob =
      new Blob(
        ['\ufeff' + csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href = url;

    link.download =
      `pendataan-${
        profile?.class_name ||
        'kelas'
      }-${date}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );

    setMessage(
      'Data berhasil diekspor.'
    );
  }

  // =========================================================
  // PRINT
  // =========================================================

  function printPage() {
    window.print();
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await sb.auth.signOut();

    window.location.href =
      '/login?role=guru';
  }

  // =========================================================
  // HYDRATION GUARD
  // =========================================================

  /*
   * Jangan render dashboard sebelum client siap.
   *
   * Server dan browser sekarang menghasilkan HTML awal
   * yang konsisten sehingga Hydration failed tidak terjadi.
   */
  if (!mounted) {
    return (
      <>
        <TopBar />

        <main className="container">
          <div className="card">
            <h2>
              Memuat Dashboard Guru...
            </h2>

            <p className="muted">
              Menyiapkan dashboard
              dan memeriksa akun.
            </p>
          </div>
        </main>
      </>
    );
  }

  // =========================================================
  // LOADING PROFILE
  // =========================================================

  if (loading) {
    return (
      <>
        <TopBar />

        <main className="container">
          <div className="card">
            <h2>
              Memuat Dashboard Guru...
            </h2>

            <p className="muted">
              Sedang memeriksa akun
              dan penugasan kelas.
            </p>
          </div>
        </main>
      </>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <TopBar />

      <main className="container">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="dashboard-head">
          <div>
            <div
              className="eyebrow"
            >
              DASHBOARD GURU /
              WALI KELAS
            </div>

            <h1>
              Halo,{' '}
              {profile?.display_name ||
                'Guru'}{' '}
              👋
            </h1>

            <p className="subtitle">
              Kelas yang Anda ampu:{' '}
              <strong>
                {profile?.class_name ||
                  'Belum ditugaskan'}
              </strong>
            </p>
          </div>

          <div className="access-badge">
            🔒 Akses kelas dibatasi
          </div>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            className="alert"
            style={{
              background:
                '#fff1f2',
              border:
                '1px solid #fecdd3',
              color:
                '#be123c',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="alert"
            style={{
              background:
                '#ecfdf5',
              border:
                '1px solid #a7f3d0',
              color:
                '#047857',
              marginBottom: 16,
            }}
          >
            {message}
          </div>
        )}

        {/* =====================================================
            FILTER PENDATAAN
        ====================================================== */}

        <div className="card">
          <div className="section-title">
            <div>
              <h2>
                Filter Pendataan
              </h2>

              <p className="muted">
                Data otomatis dibatasi
                sesuai kelas penugasan
                guru.
              </p>
            </div>

            <span className="badge">
              Kelas{' '}
              {profile?.class_name ||
                '-'}
            </span>
          </div>

          <div
            className="filter-grid"
          >
            <div>
              <label>
                Periode
              </label>

              <select
                value={period}
                onChange={(e) =>
                  setPeriod(
                    e.target
                      .value as
                      | 'harian'
                      | 'bulanan'
                  )
                }
              >
                <option value="harian">
                  Harian
                </option>

                <option value="bulanan">
                  Bulanan
                </option>
              </select>
            </div>

            <div>
              <label>
                {period ===
                'harian'
                  ? 'Tanggal'
                  : 'Bulan'}
              </label>

              <input
                type={
                  period ===
                  'harian'
                    ? 'date'
                    : 'month'
                }
                value={
                  period ===
                  'harian'
                    ? date
                    : getMonthString(
                        date
                      )
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (
                    period ===
                    'harian'
                  ) {
                    setDate(
                      value
                    );
                  } else {
                    setDate(
                      `${value}-01`
                    );
                  }
                }}
              />
            </div>

            <div>
              <label>
                Cari Siswa
              </label>

              <input
                type="text"
                placeholder="Nama siswa..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="button-row">
            <button
              className="btn primary"
              onClick={
                loadRecords
              }
              disabled={
                loadingRecords
              }
            >
              {loadingRecords
                ? '⏳ Memuat...'
                : '🔄 Muat Ulang'}
            </button>

            <button
              className="btn"
              onClick={
                printPage
              }
            >
              🖨 Print
            </button>

            <button
              className="btn"
              onClick={
                exportExcel
              }
            >
              📊 Excel
            </button>

            <button
              className="btn"
              onClick={
                logout
              }
            >
              ↪ Keluar
            </button>
          </div>
        </div>

        {/* =====================================================
            STATISTIK
        ====================================================== */}

        <div className="stat-grid">

          <div className="stat">
            <div className="stat-number">
              {totalStudents}
            </div>

            <div className="stat-label">
              Total Siswa
            </div>
          </div>

          <div className="stat">
            <div className="stat-number green">
              {totalData}
            </div>

            <div className="stat-label">
              Sudah Mengisi
            </div>
          </div>

          <div className="stat">
            <div className="stat-number red">
              {Math.max(
                totalStudents -
                  totalData,
                0
              )}
            </div>

            <div className="stat-label">
              Belum Mengisi
            </div>
          </div>

          <div className="stat">
            <div className="stat-number">
              {averagePercentage}%
            </div>

            <div className="stat-label">
              Rata-rata 7 Kebiasaan
            </div>
          </div>

        </div>

        {/* =====================================================
            TAB
        ====================================================== */}

        <div className="tabs">

          <button
            className={
              tab === 'overview'
                ? 'tab active'
                : 'tab'
            }
            onClick={() =>
              setTab(
                'overview'
              )
            }
          >
            Ringkasan
          </button>

          <button
            className={
              tab === 'records'
                ? 'tab active'
                : 'tab'
            }
            onClick={() =>
              setTab(
                'records'
              )
            }
          >
            Data Pendataan
          </button>

        </div>

        {/* =====================================================
            RINGKASAN
        ====================================================== */}

        {tab === 'overview' && (
          <>
            <div className="card">

              <div className="section-title">

                <div>
                  <h2>
                    Ringkasan 7 Kebiasaan
                  </h2>

                  <p className="muted">
                    {period ===
                    'harian'
                      ? formatDate(
                          date
                        )
                      : `Bulan ${getMonthString(
                          date
                        )}`}
                  </p>
                </div>

                <span className="badge">
                  {totalData} data
                </span>

              </div>

              {loadingRecords ? (
                <div className="empty">
                  ⏳ Sedang memuat data...
                </div>
              ) : (
                <div className="habit-grid">

                  {KEBIASAAN_KEYS.map(
                    (
                      key,
                      index
                    ) => {
                      const stat =
                        stats[key];

                      const label =
                        KEBIASAAN_LABELS[
                          key
                        ] ||
                        KEBIASAAN?.[
                          index
                        ]?.label ||
                        key;

                      return (
                        <div
                          className="habit-card"
                          key={key}
                        >

                          <div className="habit-header">

                            <strong>
                              {index + 1}.{' '}
                              {label}
                            </strong>

                            <span className="badge">
                              {
                                stat.percentage
                              }%
                            </span>

                          </div>

                          <div className="progress-track">

                            <div
                              className="progress"
                              style={{
                                width:
                                  `${stat.percentage}%`,
                              }}
                            />

                          </div>

                          <div className="muted habit-info">
                            {stat.yes} dari{' '}
                            {stat.total}{' '}
                            data dilakukan
                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                DAFTAR SISWA
            ================================================== */}

            <div className="card">

              <div className="section-title">

                <div>
                  <h2>
                    Daftar Siswa Kelas{' '}
                    {profile?.class_name}
                  </h2>

                  <p className="muted">
                    Siswa yang mempunyai
                    data pada periode
                    yang dipilih.
                  </p>
                </div>

                <span className="badge">
                  {students.length}{' '}
                  siswa
                </span>

              </div>

              {students.length ===
              0 ? (
                <div className="empty">
                  Tidak ada siswa pada
                  periode ini.
                </div>
              ) : (
                <div className="table-wrap">

                  <table className="table">

                    <thead>
                      <tr>
                        <th>
                          No
                        </th>

                        <th>
                          Nama Siswa
                        </th>

                        <th>
                          Kelas
                        </th>

                        <th>
                          Orang Tua/Wali
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {students.map(
                        (
                          student,
                          index
                        ) => (
                          <tr
                            key={`${student.student_name}-${index}`}
                          >

                            <td>
                              {index + 1}
                            </td>

                            <td>
                              <strong>
                                {
                                  student.student_name
                                }
                              </strong>
                            </td>

                            <td>
                              <span className="badge">
                                {
                                  student.student_class
                                }
                              </span>
                            </td>

                            <td>
                              {
                                student.parent_name
                              }
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>
          </>
        )}

        {/* =====================================================
            DATA PENDATAAN
        ====================================================== */}

        {tab === 'records' && (
          <div className="card">

            <div className="section-title">

              <div>
                <h2>
                  Data Pendataan
                </h2>

                <p className="muted">
                  Data yang dikirim oleh
                  orang tua/wali untuk
                  kelas{' '}
                  {profile?.class_name}.
                </p>
              </div>

              <span className="badge">
                {filteredRecords.length}{' '}
                data
              </span>

            </div>

            {filteredRecords.length ===
            0 ? (
              <div className="empty">
                Tidak ada data yang
                ditemukan.
              </div>
            ) : (
              <div className="table-wrap">

                <table className="table">

                  <thead>
                    <tr>

                      <th>
                        Tanggal
                      </th>

                      <th>
                        Nama Siswa
                      </th>

                      <th>
                        Kelas
                      </th>

                      <th>
                        Orang Tua/Wali
                      </th>

                      {KEBIASAAN_KEYS.map(
                        (key) => (
                          <th
                            key={key}
                          >
                            {
                              KEBIASAAN_LABELS[
                                key
                              ]
                            }
                          </th>
                        )
                      )}

                    </tr>
                  </thead>

                  <tbody>

                    {filteredRecords.map(
                      (record) => (
                        <tr
                          key={
                            record.id
                          }
                        >

                          <td>
                            {formatDate(
                              record.record_date
                            )}
                          </td>

                          <td>
                            <strong>
                              {
                                record.student_name
                              }
                            </strong>
                          </td>

                          <td>
                            <span className="badge">
                              {
                                record.student_class
                              }
                            </span>
                          </td>

                          <td>
                            {
                              record.parent_name ||
                              '-'
                            }
                          </td>

                          {KEBIASAAN_KEYS.map(
                            (key) => {
                              const value =
                                record[
                                  key
                                ];

                              const yes =
                                value ===
                                true;

                              const no =
                                value ===
                                false;

                              return (
                                <td
                                  key={
                                    key
                                  }
                                  style={{
                                    textAlign:
                                      'center',
                                  }}
                                >

                                  {yes ? (
                                    <span className="badge success">
                                      ✓ Ya
                                    </span>
                                  ) : no ? (
                                    <span
                                      className="badge"
                                      style={{
                                        opacity:
                                          0.65,
                                      }}
                                    >
                                      − Tidak
                                    </span>
                                  ) : (
                                    <span className="muted">
                                      -
                                    </span>
                                  )}

                                </td>
                              );
                            }
                          )}

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        )}

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="footer">
          UPTD SMPN 11 SINJAI
          {' • '}
          Dashboard Guru
        </div>

      </main>

      {/* =======================================================
          CSS KHUSUS HALAMAN
      ======================================================== */}

      <style jsx global>{`

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .dashboard-head {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 28px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          box-shadow:
            0 8px 30px
            rgba(
              15,
              23,
              42,
              0.05
            );
        }

        .eyebrow {
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }

        .dashboard-head h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          color: #172033;
        }

        .subtitle {
          margin-top: 7px;
          color: #64748b;
        }

        .access-badge {
          background: #eff6ff;
          color: #2563eb;
          border-radius: 999px;
          padding: 10px 15px;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
        }

        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow:
            0 4px 18px
            rgba(
              15,
              23,
              42,
              0.04
            );
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .section-title h2 {
          margin: 0;
          color: #172033;
          font-size: 20px;
        }

        .section-title p {
          margin-bottom: 0;
        }

        .muted {
          color: #64748b;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 5px 10px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .badge.success {
          background: #ecfdf5;
          color: #047857;
        }

        .filter-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 12px;
        }

        label {
          display: block;
          margin-bottom: 7px;
          font-weight: 700;
          color: #334155;
        }

        input,
        select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 11px 13px;
          font-size: 15px;
          background: white;
          color: #172033;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(
              37,
              99,
              235,
              0.12
            );
        }

        .button-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        button {
          font-family: inherit;
        }

        .btn {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          border-radius: 11px;
          padding: 10px 15px;
          cursor: pointer;
          font-weight: 700;
        }

        .btn:hover {
          background: #f8fafc;
        }

        .btn.primary {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .btn.primary:hover {
          background: #1d4ed8;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .stat-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-bottom: 18px;
        }

        .stat {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
        }

        .stat-number {
          font-size: 30px;
          font-weight: 800;
          color: #172033;
        }

        .stat-number.green {
          color: #15803d;
        }

        .stat-number.red {
          color: #dc2626;
        }

        .stat-label {
          margin-top: 4px;
          color: #64748b;
          font-weight: 600;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .tab {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          border-radius: 11px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 800;
        }

        .tab.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .habit-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
        }

        .habit-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          background: #f8fafc;
        }

        .habit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .progress-track {
          height: 10px;
          border-radius: 99px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .progress {
          height: 100%;
          background: #2563eb;
          border-radius: 99px;
          transition: width 0.25s ease;
        }

        .habit-info {
          margin-top: 8px;
          font-size: 14px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        th,
        td {
          padding: 12px;
          border-bottom:
            1px solid #e2e8f0;
          text-align: left;
          vertical-align: middle;
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 800;
        }

        tr:hover td {
          background: #fafafa;
        }

        .empty {
          padding: 28px;
          text-align: center;
          border-radius: 14px;
          background: #f8fafc;
          color: #64748b;
        }

        .alert {
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 600;
        }

        .footer {
          color: #64748b;
          margin-top: 24px;
          margin-bottom: 30px;
          text-align: center;
        }

        @media (max-width: 900px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }

          .stat-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 768px) {
          .container {
            padding: 14px;
          }

          .dashboard-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .dashboard-head h1 {
            font-size: 26px;
          }

          .access-badge {
            white-space: normal;
          }

          .card {
            padding: 16px;
          }

          .habit-grid {
            grid-template-columns: 1fr;
          }

          .stat-grid {
            grid-template-columns: 1fr;
          }

          .section-title {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media print {
          .btn,
          button,
          .tabs {
            display: none !important;
          }

          .card {
            box-shadow: none;
            break-inside: avoid;
          }

          body {
            background: white !important;
          }
        }

      `}</style>
    </>
  );
}
