import AnimationViewer from './animation-viewer';
import MainContent from './main-content';

export default function Page() {
  return (
    <main className="h-[100dvh] overflow-y-auto snap-y snap-mandatory">
      <AnimationViewer />
      <MainContent />
    </main>
  );
}
