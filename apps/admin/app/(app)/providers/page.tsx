import { getSupabaseServer } from '@urban-assist/db/server';
import { Users, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const db = getSupabaseServer();
  const { data: providers } = await db
    .from('profiles')
    .select('id, full_name, email, is_online, kyc_status, created_at')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
    .limit(50);

  const count = providers?.length ?? 0;
  const onlineCount = providers?.filter((p) => p.is_online).length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Providers</h1>
        <p className="text-sm text-muted mt-1">
          {count} registered · {onlineCount} online now.
        </p>
      </div>

      {!providers || providers.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Users className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No providers registered yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-ink text-sm">
                    {p.full_name ?? 'Unnamed'}
                  </p>
                  <p className="text-xs text-muted">{p.email}</p>
                </div>
                <span
                  className={`text-xs font-mono-utility px-2 py-0.5 rounded-full ${
                    p.kyc_status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : p.kyc_status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {p.kyc_status}
                </span>
                {p.is_online && (
                  <span className="text-xs text-green-600 font-medium">Online</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
