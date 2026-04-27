import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Web2Native - SANN404 FORUM',
  description: 'Convert your website into a native Android and iOS application easily. Developed by SANN404 FORUM.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body className="antialiased font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
