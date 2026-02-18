'use client';

import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

const FIRST_NAME = 'Leopold';
const LAST_NAME = 'Bauer';

function LetterPull({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex overflow-hidden">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: delay + i * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 40,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function ProjectCard({
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
  const isInView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });

  return (
    <motion.div
      ref={ref}
      className="h-full"
      initial={{ opacity: 0, y: 50, scale: 0.97 }}
      animate={
        isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.97 }
      }
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">
        <motion.div
          className="border border-white/[0.08] rounded-2xl p-8 md:p-10 bg-white/[0.01] backdrop-blur-sm h-full"
          whileHover={{
            borderColor: 'rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            y: -4,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-white text-2xl md:text-3xl mb-3">{title}</h3>
              <p className="text-white/40 font-sans text-base md:text-lg leading-relaxed max-w-lg">
                {description}
              </p>
            </div>
            <motion.span
              className="text-white/20 text-lg font-sans mt-2 shrink-0"
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              &rarr;
            </motion.span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function MainContent() {
  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="min-h-[100dvh] flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <h1 className="text-white text-7xl md:text-8xl lg:text-9xl leading-[0.95]">
          <LetterPull text={FIRST_NAME} delay={0.3} />
        </h1>
        <h1 className="text-white text-7xl md:text-8xl lg:text-9xl leading-[0.95]">
          <LetterPull text={LAST_NAME} delay={0.6} />
        </h1>
        <motion.p
          className="text-white/40 text-lg md:text-xl font-sans mt-8 max-w-lg tracking-wide"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Software Developer at{' '}
          <Link
            href="https://titanom.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors duration-300"
          >
            Titanom Technologies
          </Link>{' '}
          &mdash; Munich
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg
              width="20"
              height="32"
              viewBox="0 0 20 32"
              fill="none"
              className="text-white/20"
            >
              <rect
                x="1"
                y="1"
                width="18"
                height="30"
                rx="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <motion.circle
                cx="10"
                r="2"
                fill="currentColor"
                animate={{ cy: [9, 16, 9] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Projects */}
      <section className="px-8 md:px-16 lg:px-24 pt-16 pb-32">
        <ScrollReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-16">
            Projects
          </p>
        </ScrollReveal>

        {/* Pertolo */}
        <ScrollReveal className="mb-6">
          <p className="text-white/20 text-xs font-sans tracking-[0.15em] uppercase mb-6">
            Pertolo &mdash; pertolo.iieo.de
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mb-12">
          <ProjectCard
            href="https://pertolo.iieo.de/drink"
            title="Drink"
            description="The ultimate party game. Challenges, rules, and drinks for your next get-together."
            delay={0}
          />
          <ProjectCard
            href="https://pertolo.iieo.de/imposter"
            title="Imposter"
            description="Find the secret agents. A social deduction game for groups."
            delay={0.1}
          />
          <ProjectCard
            href="https://pertolo.iieo.de/bco-trainer"
            title="Trainer"
            description="Train your rhythm skills. A practice tool for musicians."
            delay={0.2}
          />
        </div>

        {/* Vereinsmanager */}
        <div className="max-w-5xl">
          <ProjectCard
            href="https://verein.iieo.de"
            title="Vereinsmanager"
            description="Club management made simple. Organize members, events, and your team — all in one place."
            delay={0}
          />
        </div>
      </section>

      {/* Work & Education */}
      <section className="px-8 md:px-16 lg:px-24 pb-32">
        <ScrollReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-16">
            Work & Education
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          <ProjectCard
            href="https://titanom.com"
            title="Titanom Technologies"
            description="Building AI-powered solutions for education and learning. Tools that make teaching and training smarter."
            delay={0}
          />
          <ProjectCard
            href="https://www.tum.de"
            title="TU Munich"
            description="Studied at the Technical University of Munich — one of Europe's leading universities in engineering and technology."
            delay={0.1}
          />
        </div>
      </section>

      {/* Contact */}
      <section className="min-h-[60dvh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-24">
        <ScrollReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-10">
            Get in touch
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <motion.a
            href="mailto:leopoldbauer@duck.com"
            className="text-white text-2xl md:text-4xl lg:text-5xl font-rubik inline-block break-all"
            whileHover={{ opacity: 0.6, x: 4 }}
            transition={{ duration: 0.3 }}
          >
            leopoldbauer@duck.com
          </motion.a>
        </ScrollReveal>
      </section>
    </div>
  );
}

export default MainContent;
