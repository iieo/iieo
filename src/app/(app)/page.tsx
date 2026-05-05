import AnimationViewer from './animation-viewer';
import MainContent from './main-content';
import { Footer } from '@/components/footer';

export default function Page() {
  return (
    <main className="h-dvh overflow-y-auto overflow-x-hidden md:snap-y md:snap-proximity">
      <AnimationViewer />
      <MainContent />
      <div className="md:snap-start">
        <Footer />
      </div>
    </main>
  );
}
