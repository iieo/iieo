import type { Metadata } from 'next';

import ImageConverter from './image-converter';

export const metadata: Metadata = {
  title: 'Image Converter — Tools',
  description:
    'Bilder konvertieren, komprimieren, zuschneiden und erweitern. PNG, JPEG, WEBP, ICO — alles direkt im Browser.',
};

export default function ImageConverterPage() {
  return <ImageConverter />;
}
