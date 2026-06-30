import { LoginForm } from './login-form';

export const metadata = { title: 'Provider sign in — HomeEase' };

export default function Page() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="font-mono-utility text-muted">For providers</p>
        <h1 className="font-display text-2xl">Sign in to earn</h1>
        <p className="mt-2 text-sm text-muted">
          Set your hours, accept jobs near you, get paid.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
