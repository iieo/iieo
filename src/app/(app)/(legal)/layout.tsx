import { Footer } from '@/components/footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
