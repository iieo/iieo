import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export async function getValidUserSession(fallbackUrl = '/login') {
  const session = await getServerSession();

  if (session === null) redirect(fallbackUrl);

  return session;
}

export async function getMaybeUserSession() {
  return await getServerSession();
}
