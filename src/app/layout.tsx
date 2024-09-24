import type { Metadata } from 'next';
import { Inter, Rubik_Mono_One } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const rubikMonoOne = Rubik_Mono_One({
  weight: '400',
  subsets: ['latin'],
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
      <body className={rubikMonoOne.className}>{children}</body>
    </html>
  );
}
