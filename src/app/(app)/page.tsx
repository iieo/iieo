import ParticleAnimation from '@/components/particle-animation';

export default function Page() {
  return (
    <main className="h-screen flex items-center justify-center k">
      <ParticleAnimation />
      <div className="flex flex-col justify-between w-full px-8 gap-8">
        <div>
          <h1 className="text-white text-8xl max-md:text-5xl">Leopold</h1>
          <h1 className="text-white text-8xl max-md:text-5xl">Bauer</h1>
        </div>
        <div>
          {/* <Link
            href="https://formfast.bauerleopold.de"
            className="border-white border-2 rounded text-white px-2 py-4 hover:bg-surface"
            target="_blank"
            rel="noopener noreferrer"
          >
            Form Fast
          </Link> */}
          <p className='text-white'>coming soon...</p>
        </div>
      </div>
    </main>
  );
}
