import { getValidUserSession } from '@/utils/auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
