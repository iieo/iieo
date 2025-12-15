import Link from 'next/link';

function MainContent() {
  return (
    <div
      className="relative z-10 flex flex-col w-full px-8 h-[100dvh]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="h-[50dvh] flex flex-col justify-end items-start">
        <h1 className="text-white text-8xl max-md:text-5xl">Leopold</h1>
        <h1 className="text-white text-8xl max-md:text-5xl">Bauer</h1>
      </div>
      <div className="h-[50dvh] flex py-4">
        <div className="flex gap-4">
          <Link
            href="https://pertolo.iieo.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="border-white border-2 rounded text-white px-6 py-4 hover:bg-surface hover:scale-105 transition-transform duration-200">
              <h2 className="text-xl">Pertolo</h2>
              <p className="text-sm">The Drinking Game</p>
            </div>
          </Link>
          <Link
            href="https://verein.iieo.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="border-white border-2 rounded text-white px-6 py-4 hover:bg-surface hover:scale-105 transition-transform duration-200">
              <h2 className="text-xl">Vereinsmanager</h2>
              <p className="text-sm">Verwalte deinen Verein</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MainContent;
