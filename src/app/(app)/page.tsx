import AnimationViewer from './animation-viewer';
import MainContent from './main-content';
import { Footer } from '@/components/footer';

export default function Page() {
  return (
    <div className="relative h-dvh overflow-hidden">
      <main className="h-full overflow-y-auto overflow-x-hidden md:snap-y md:snap-proximity">
        <AnimationViewer />
        <MainContent />
        <div className="md:snap-start">
          <Footer />
        </div>
      </main>

      {/* Persistent Minimalist Legal Links */}
      <nav className="fixed bottom-4 right-6 z-50 flex gap-4 text-[10px] font-sans uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors duration-500 max-md:hidden">
        <a href="/impressum" className="hover:text-white transition-colors">Impressum</a>
        <a href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</a>
      </nav>
    </div>
  );
}
