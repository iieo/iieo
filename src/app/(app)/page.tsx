import MainContent from './main-content';
import AnimationViewer from './animation-viewer';

export default function Page() {
  return (
    <main className="h-screen flex items-center justify-center">
      <AnimationViewer />
      <MainContent />
    </main>
  );
}
