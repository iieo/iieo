'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const FIRST_NAME = 'Leopold';
const LAST_NAME = 'Bauer';

const SECTIONS = ['Leopold', 'Projects', 'Experience', 'Contact'] as const;

const ease = [0.22, 1, 0.36, 1] as const;

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
          {char}
        </motion.span>
      ))}
    </span>
  );
}

function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.7, delay, ease }}
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
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  return (
    <motion.div
      ref={ref}
      className="h-full"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.97 }}
      transition={{ duration: 0.7, delay, ease }}
    >
      <Link href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">
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
            <motion.span
              className="text-white/20 text-lg font-sans mt-1 shrink-0 group-hover:text-white/50 transition-colors"
            >
              &rarr;
            </motion.span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function NavDots({
  active,
  onNavigate,
}: {
  active: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <motion.nav
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 max-md:hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2, duration: 0.8, ease }}
    >
      {SECTIONS.map((label, i) => (
        <button
          key={label}
          onClick={() => onNavigate(i)}
          className="group relative flex items-center justify-end"
        >
          <AnimatePresence>
            {active === i && (
              <motion.span
                className="absolute right-5 text-white/50 text-[10px] font-sans tracking-widest uppercase whitespace-nowrap"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3 }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div
            className="w-2 h-2 rounded-full border border-white/30"
            animate={{
              backgroundColor: active === i ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0)',
              scale: active === i ? 1.3 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        </button>
      ))}
    </motion.nav>
  );
}

function MainContent() {
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    scrollContainerRef.current = main;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) setActiveSection(index);
          }
        });
      },
      { root: main, threshold: 0.6 },
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = useCallback((index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  }, []);

  const navigateTo = useCallback((index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="relative z-10">
      <NavDots active={activeSection} onNavigate={navigateTo} />

      {/* Hero */}
      <section
        ref={setSectionRef(0)}
        className="h-[100dvh] snap-start snap-always flex flex-col justify-center px-8 md:px-16 lg:px-24 relative"
      >
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
          transition={{ duration: 0.8, delay: 1.1, ease }}
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
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none" className="text-white/20">
              <rect x="1" y="1" width="18" height="30" rx="9" stroke="currentColor" strokeWidth="1.5" />
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
      <section
        ref={setSectionRef(1)}
        className="h-[100dvh] snap-start snap-always flex flex-col justify-center px-8 md:px-16 lg:px-24"
      >
        <SectionReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-8">
            Projects
          </p>
        </SectionReveal>

        <SectionReveal delay={0.05} className="mb-4">
          <p className="text-white/20 text-xs font-sans tracking-[0.15em] uppercase mb-4">
            Pertolo &mdash; pertolo.iieo.de
          </p>
        </SectionReveal>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mb-6">
          <ProjectCard
            href="https://pertolo.iieo.de/drink"
            title="Drink"
            description="The ultimate party game. Challenges, rules, and drinks for your next get-together."
            delay={0.1}
          />
          <ProjectCard
            href="https://pertolo.iieo.de/imposter"
            title="Imposter"
            description="Find the secret agents. A social deduction game for groups."
            delay={0.15}
          />
          <ProjectCard
            href="https://pertolo.iieo.de/bco-trainer"
            title="Trainer"
            description="Train your rhythm skills. A practice tool for musicians."
            delay={0.2}
          />
        </div>

        <div className="max-w-5xl">
          <ProjectCard
            href="https://verein.iieo.de"
            title="Vereinsmanager"
            description="Club management made simple. Organize members, events, and your team — all in one place."
            delay={0.25}
          />
        </div>
      </section>

      {/* Work & Education */}
      <section
        ref={setSectionRef(2)}
        className="h-[100dvh] snap-start snap-always flex flex-col justify-center px-8 md:px-16 lg:px-24"
      >
        <SectionReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-8">
            Work & Education
          </p>
        </SectionReveal>

        <div className="grid md:grid-cols-2 gap-4 max-w-5xl">
          <ProjectCard
            href="https://titanom.com"
            title="Titanom Technologies"
            description="Building AI-powered solutions for education and learning. Tools that make teaching and training smarter."
            delay={0.1}
          />
          <ProjectCard
            href="https://www.tum.de"
            title="TU Munich"
            description="Studied at the Technical University of Munich — one of Europe's leading universities in engineering and technology."
            delay={0.15}
          />
        </div>
      </section>

      {/* Contact */}
      <section
        ref={setSectionRef(3)}
        className="h-[100dvh] snap-start snap-always flex flex-col justify-center px-8 md:px-16 lg:px-24 relative"
      >
        <SectionReveal>
          <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-10">
            Get in touch
          </p>
        </SectionReveal>
        <SectionReveal delay={0.1}>
          <motion.a
            href="mailto:leopoldbauer@duck.com"
            className="text-white text-2xl md:text-4xl lg:text-5xl font-rubik inline-block break-all"
            whileHover={{ opacity: 0.6, x: 4 }}
            transition={{ duration: 0.3 }}
          >
            leopoldbauer@duck.com
          </motion.a>
        </SectionReveal>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 font-sans">
          <span className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Leopold Bauer
          </span>
          <a href="/impressum" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            Impressum
          </a>
          <a href="/datenschutz" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            Datenschutz
          </a>
        </div>
      </section>
    </div>
  );
}

export default MainContent;
