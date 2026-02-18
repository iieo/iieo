import type { Metadata } from 'next';
import { Inter, Rubik_Mono_One } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const rubikMonoOne = Rubik_Mono_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-rubik',
});

export const metadata: Metadata = {
  title: 'Leopold Bauer',
  description: 'Portfolio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${rubikMonoOne.variable} font-rubik antialiased`}>
        {children}
        <footer className="font-sans relative z-10 py-8 px-8 text-white flex justify-center gap-6 border-t border-white/5">
          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} Leopold Bauer
          </span>
          <a
            href="/impressum"
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Impressum
          </a>
          <a
            href="/datenschutz"
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Datenschutz
          </a>
        </footer>
      </body>
    </html>
  );
}
