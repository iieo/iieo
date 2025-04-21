import Link from "next/link";

function MainContent() {
    return (
        <div className="flex flex-col justify-between w-full px-8 gap-8">
            <div>
                <h1 className="text-white text-8xl max-md:text-5xl">Leopold</h1>
                <h1 className="text-white text-8xl max-md:text-5xl">Bauer</h1>
            </div>
            <div>
                <Link
                    href="https://pertolo.iieo.de"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <div className="border-white border-2 rounded text-white px-6 py-4 hover:bg-surface w-fit hover:scale-105 transition-transform duration-200">
                        <h2 className="text-2xl">Pertolo</h2>
                        <p className="text-sm">The Drinking Game</p>
                    </div>
                </Link>
            </div>
        </div>);
}

export default MainContent;