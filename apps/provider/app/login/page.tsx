import { LoginForm } from './login-form';

export const metadata = { title: 'Provider sign in — Urban Assist Pro' };

export default function Page() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="hidden items-center justify-center lg:flex"
        style={{
          background:
            'repeating-linear-gradient(135deg,#EDE6D8,#EDE6D8 10px,#E4DBC9 10px,#E4DBC9 20px)',
        }}
      >
        <p className="font-mono text-[11px] text-[#8A8574]">professional at work — photo</p>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-12 pb-28 lg:pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-ink text-sm font-extrabold text-white">
              UA
            </span>
            <span className="font-extrabold text-ink">Urban Assist</span>
          </div>
          <p className="mt-6 font-mono-utility text-muted">For providers</p>
          <h1 className="font-display text-2xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage your jobs and earnings.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
