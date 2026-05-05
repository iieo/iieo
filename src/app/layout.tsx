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
      <body
        className={`${inter.variable} ${rubikMonoOne.variable} font-rubik antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
