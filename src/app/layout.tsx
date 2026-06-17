import type { Metadata } from 'next';
import { Inter, Rubik_Mono_One } from 'next/font/google';
import Script from 'next/script';

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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8XKNRE85K2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8XKNRE85K2');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
