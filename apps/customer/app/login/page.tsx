import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in — HomeEase' };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          New to HomeEase? You'll be signed up on first use.
        </p>
      </div>
      <LoginForm />
      <p className="mt-8 text-center text-xs text-muted">
        By continuing you agree to the{' '}
        <a className="underline" href="/terms">terms</a> and{' '}
        <a className="underline" href="/privacy">privacy policy</a>.
      </p>
    </div>
  );
}
