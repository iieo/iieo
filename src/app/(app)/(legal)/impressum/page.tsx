import React from 'react';

function Imprint() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-24 font-sans text-white/70 leading-relaxed">
      <h1 className="text-4xl md:text-5xl font-bold mb-12 text-white font-rubik tracking-tight">Impressum</h1>
      <section className="mb-10">
        <p className="mb-4 text-white/70">Angaben gemäß § 5 DDG</p>
        <address className="not-italic text-white/70">
          Leopold Bauer
          <br />
          Potsdamerstraße 13
          <br />
          80802 München
          <br />
        </address>
      </section>

      <section className="mb-10">
        <strong className="font-semibold text-white">Vertreten durch:</strong>
        <br />
        Leopold Bauer
      </section>

      <section className="mb-10">
        <strong className="font-semibold text-white">Kontakt:</strong>
        <br />
        Telefon:{' '}
        <a href="tel:+4917684994760" className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4">
          +49-17681701855
        </a>
        <br />
        E-Mail:{' '}
        <a href="mailto:leopoldbauer@duck.com" className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4">
          leopoldbauer@duck.com
        </a>
      </section>

      <section className="mb-10">
        <strong className="font-semibold text-white">Haftungsausschluss:</strong>
        <br />
        <strong className="font-semibold text-white">Haftung für Inhalte</strong>
        <p className="mb-6 text-white/70">
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als
          Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter
          jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
          hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach
          den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
          erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
          Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
          entfernen.
        </p>
        <strong className="font-semibold text-white">Haftung für Links</strong>
        <p className="mb-6 text-white/70">
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
          mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
          Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
          ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
          Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
        <strong className="font-semibold text-white">Datenschutz</strong>
        <p>
          Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich.
          Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder
          eMail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger
          Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte
          weitergegeben.
          <br />
          Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation
          per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem
          Zugriff durch Dritte ist nicht möglich.
          <br />
          Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte
          zur Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien
          wird hiermit ausdrücklich widersprochen. Die Betreiber der Seiten behalten sich
          ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von
          Werbeinformationen, etwa durch Spam-Mails, vor.
        </p>
      </section>

      <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-white/40">
        Erstellt mit dem{' '}
        <a
          href="https://impressum-generator.de"
          rel="dofollow"
          className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4"
        >
          Impressum-Generator
        </a>{' '}
        von WebsiteWissen.com, dem Ratgeber für{' '}
        <a
          href="https://websitewissen.com/website-erstellen"
          rel="dofollow"
          className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4"
        >
          Website-Erstellung
        </a>
        ,{' '}
        <a
          href="https://websitewissen.com/homepage-baukasten-vergleich"
          rel="dofollow"
          className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4"
        >
          Homepage-Baukästen
        </a>{' '}
        und{' '}
        <a
          href="https://websitewissen.com/shopsysteme-vergleich"
          rel="dofollow"
          className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4"
        >
          Shopsysteme
        </a>
        . Rechtstext von der{' '}
        <a
          href="https://www.kanzlei-hasselbach.de/"
          rel="dofollow"
          className="text-white hover:text-white/70 transition-colors underline decoration-white/30 underline-offset-4"
        >
          Kanzlei Hasselbach
        </a>
        .
      </footer>
    </main>
  );
}

export default Imprint;
