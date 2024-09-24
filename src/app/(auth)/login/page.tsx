import Login from './login';
import { pageContextSchema } from './schema';

export default async function LoginPage(_context: unknown) {
  const context = pageContextSchema.parse(_context);

  return <Login submitText="Login" error={context?.searchParams?.error} />;
}
