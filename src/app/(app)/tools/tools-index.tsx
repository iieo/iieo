'use client';

import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

const TOOLS = [
  {
    href: '/tools/qr-code-generator',
    title: 'QR-Code Generator',
    description:
      'QR-Codes für Links, WiFi, vCards und mehr — mit Logo, eigenen Farben und Export als PNG/SVG.',
  },
] as const;

function LetterPull({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex overflow-hidden">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: delay + i * 0.04, ease }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  );
}

function ToolCard({
  href,
  title,
  description,
  delay = 0,
}: {
  href: string;
  title: string;
  description: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  return (
    <motion.div
      ref={ref}
      className="h-full"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.97 }}
      transition={{ duration: 0.7, delay, ease }}
    >
      <Link href={href} className="block group h-full">
        <motion.div
          className="border border-white/[0.08] rounded-2xl p-6 md:p-8 bg-white/[0.01] backdrop-blur-sm h-full"
          whileHover={{
            borderColor: 'rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            y: -4,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-white text-xl md:text-2xl mb-2">{title}</h3>
              <p className="text-white/40 font-sans text-sm md:text-base leading-relaxed">
                {description}
              </p>
            </div>
            <span className="text-white/20 text-lg font-sans mt-1 shrink-0 group-hover:text-white/50 transition-colors">
              &rarr;
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function ToolsIndex() {
  return (
    <section className="min-h-[calc(100dvh-80px)] flex flex-col justify-center px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-6xl mx-auto">
      <motion.p
        className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease }}
      >
        Tools
      </motion.p>

      <h1 className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] mb-8">
        <LetterPull text="Werkzeuge." delay={0.3} />
      </h1>

      <motion.p
        className="text-white/40 font-sans text-base md:text-lg max-w-xl mb-12 tracking-wide"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease }}
      >
        Eine Sammlung schneller, browserbasierter Tools. Alles läuft lokal — keine Daten verlassen
        deinen Browser.
      </motion.p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-5xl">
        {TOOLS.map((tool, i) => (
          <ToolCard
            key={tool.href}
            href={tool.href}
            title={tool.title}
            description={tool.description}
            delay={1.1 + i * 0.05}
          />
        ))}
      </div>
    </section>
  );
}
