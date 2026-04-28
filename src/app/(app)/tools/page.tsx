import type { Metadata } from 'next';

import ToolsIndex from './tools-index';

export const metadata: Metadata = {
  title: 'Tools — Leopold Bauer',
  description: 'Eine Sammlung kleiner, nützlicher Web-Tools.',
};

export default function ToolsIndexPage() {
  return <ToolsIndex />;
}
