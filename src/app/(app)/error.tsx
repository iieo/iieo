'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect } from 'react';
import { Footer } from '@/components/footer';

const ease = [0.22, 1, 0.36, 1] as const;

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 md:px-16 lg:px-24 bg-black text-white py-20">
        <motion.p
          className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          Error
        </motion.p>

        <motion.h1
          className="text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
        >
          500
        </motion.h1>

        <motion.p
          className="text-white/40 text-lg md:text-xl font-sans mt-8 max-w-lg tracking-wide text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
        >
          Something went wrong on this page.
          {error.digest && (
            <span className="block text-white/20 text-xs mt-3 font-mono">{error.digest}</span>
          )}
        </motion.p>

        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
        >
          <button
            onClick={reset}
            className="border border-white/[0.15] hover:border-white/40 hover:bg-white/[0.03] rounded-full px-6 py-2.5 text-white/70 hover:text-white transition-all duration-300"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-white/[0.15] hover:border-white/40 hover:bg-white/[0.03] rounded-full px-6 py-2.5 text-white/70 hover:text-white transition-all duration-300"
          >
            Back home
          </Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
