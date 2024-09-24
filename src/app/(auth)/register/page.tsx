import Register from './register';
import { pageContextSchema } from './schema';

export default async function RegisterPage(_context: unknown) {
  const context = pageContextSchema.parse(_context);

  return <Register error={context?.searchParams?.error} />;
}
