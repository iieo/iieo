import Link from 'next/link';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="fixed top-0 inset-x-0 z-40 px-6 sm:px-8 md:px-16 lg:px-24 py-6 flex items-center justify-between bg-linear-to-b from-black/80 to-transparent backdrop-blur-sm">
        <Link
          href="/"
          className="text-white/40 hover:text-white text-xs font-sans tracking-[0.2em] uppercase transition-colors"
        >
          &larr; Leopold Bauer
        </Link>
        <Link
          href="/tools"
          className="text-white/40 hover:text-white text-xs font-sans tracking-[0.2em] uppercase transition-colors"
        >
          Tools
        </Link>
      </header>
      <div className="pt-20">{children}</div>
    </main>
  );
}
