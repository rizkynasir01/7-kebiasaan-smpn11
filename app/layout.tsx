import './globals.css';
import { SCHOOL, APP_NAME } from '@/lib/constants';

export const metadata = {
  title: `${APP_NAME} — ${SCHOOL}`,
  description: 'Pendataan harian 7 Kebiasaan Anak Indonesia Hebat',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}