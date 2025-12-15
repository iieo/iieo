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
        <footer className="font-sans fixed bottom-0 left-0 right-0 text-center p-2 bg-black text-white flex justify-center gap-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Leopold Bauer. All rights reserved.
          </p>
          <p className="text-xs">
            <a href="/impressum" className="text-gray-400 hover:underline">
              Impressum
            </a>
          </p>
          <p className="text-xs">
            <a href="/datenschutz" className="text-gray-400 hover:underline">
              Datenschutz
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
