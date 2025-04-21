import ParticleAnimation from '@/components/particle-animation';
import MainContent from './main-content';
import VortexShader from '@/components/vortex-animation';
import AnimationViewer from './animation-viewer';

export default function Page() {
  return (
    <main className="h-screen flex items-center justify-center">
      <AnimationViewer />
      <MainContent />
    </main>
  );
}
