import React from 'react';

export function Footer() {
  return (
    <footer className="font-sans relative z-10 py-8 px-8 text-white flex justify-center gap-6 border-t border-white/5">
      <span className="text-xs text-white/25">© {new Date().getFullYear()} Leopold Bauer</span>
      <a href="/tools" className="text-xs text-white/25 hover:text-white/50 transition-colors">
        Tools
      </a>
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
  );
}
