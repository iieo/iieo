import ParticleAnimation from '@/components/particle-animation';
import MainContent from './main-content';

export default function Page() {
  return (
    <main className="h-screen flex items-center justify-center">
      <ParticleAnimation />
      <MainContent />
    </main>
  );
}
