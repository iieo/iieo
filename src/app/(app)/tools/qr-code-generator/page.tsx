import type { Metadata } from 'next';

import QrGenerator from './qr-generator';

export const metadata: Metadata = {
  title: 'QR-Code Generator — Tools',
  description:
    'Anpassbarer QR-Code-Generator für URLs, WiFi, vCards und mehr. Mit Logo, Farben und SVG-Export. Läuft komplett im Browser.',
};

export default function QrCodeGeneratorPage() {
  return <QrGenerator />;
}
