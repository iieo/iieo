import React from "react";

function Imprint() {
    return (
        <main className="max-w-2xl mx-auto p-8 font-sans">
            <h1 className="text-3xl font-bold mb-6">Impressum</h1>
            <section className="mb-6">
                <p className="mb-2">Angaben gemäß § 5 DDG</p>
                <address className="not-italic">
                    Leopold Bauer<br />
                    Potsdamerstraße 13<br />
                    80802 München<br />
                </address>
            </section>

            <section className="mb-6">
                <strong className="font-semibold">Vertreten durch:</strong>
                <br />
                Leopold Bauer
            </section>

            <section className="mb-6">
                <strong className="font-semibold">Kontakt:</strong>
                <br />
                Telefon: <a href="tel:+4917684994760" className="text-blue-600 hover:underline">+49-17681701855</a>
                <br />
                E-Mail:{" "}
                <a href="mailto:leopoldbauer@duck.com" className="text-blue-600 hover:underline">
                    leopoldbauer@duck.com
                </a>
            </section>

            <section className="mb-6">
                <strong className="font-semibold">Haftungsausschluss:</strong>
                <br />
                <strong className="font-semibold">Haftung für Inhalte</strong>
                <p className="mb-4">
                    Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                </p>
                <strong className="font-semibold">Haftung für Links</strong>
                <p className="mb-4">
                    Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                </p>
                <strong className="font-semibold">Datenschutz</strong>
                <p>
                    Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder eMail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben.
                    <br />
                    Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.
                    <br />
                    Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte zur Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit ausdrücklich widersprochen. Die Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-Mails, vor.
                </p>
            </section>

            <footer className="mt-8 text-sm text-gray-500">
                Erstellt mit dem{" "}
                <a href="https://impressum-generator.de" rel="dofollow" className="text-blue-600 hover:underline">
                    Impressum-Generator
                </a>{" "}
                von WebsiteWissen.com, dem Ratgeber für{" "}
                <a href="https://websitewissen.com/website-erstellen" rel="dofollow" className="text-blue-600 hover:underline">
                    Website-Erstellung
                </a>
                ,{" "}
                <a
                    href="https://websitewissen.com/homepage-baukasten-vergleich"
                    rel="dofollow"
                    className="text-blue-600 hover:underline"
                >
                    Homepage-Baukästen
                </a>{" "}
                und{" "}
                <a
                    href="https://websitewissen.com/shopsysteme-vergleich"
                    rel="dofollow"
                    className="text-blue-600 hover:underline"
                >
                    Shopsysteme
                </a>
                . Rechtstext von der{" "}
                <a href="https://www.kanzlei-hasselbach.de/" rel="dofollow" className="text-blue-600 hover:underline">
                    Kanzlei Hasselbach
                </a>
                .
            </footer>
        </main>
    );
}

export default Imprint;