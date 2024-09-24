import ParticleAnimation from '@/components/particle-animation';

export default function Page() {
  return (
    <main className="h-screen flex items-center justify-center">
      <ParticleAnimation />
      <div className="flex flex-col justify-between w-full px-8">
        <h1 className="text-white text-8xl max-md:text-5xl">Leopold</h1>
        <h1 className="text-white text-8xl max-md:text-5xl">Bauer</h1>
      </div>
    </main>
  );
}
