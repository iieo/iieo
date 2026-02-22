import AnimationViewer from './animation-viewer';
import MainContent from './main-content';

export default function Page() {
  return (
    <main className="h-dvh overflow-y-auto overflow-x-hidden md:snap-y md:snap-mandatory">
      <AnimationViewer />
      <MainContent />
    </main>
  );
}
