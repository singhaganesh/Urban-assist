import { createSign } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function registerToken(
  db: SupabaseClient,
  profileId: string,
  token: string,
  device?: string,
) {
  await db
    .from('fcm_tokens')
    .upsert({ token, profile_id: profileId, device: device ?? null }, { onConflict: 'token' });
}

// --- FCM HTTP v1 via service-account JWT. Node stdlib only; no firebase-admin. ---

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const sa = JSON.parse(raw);
  // env vars often carry the key with escaped newlines
  sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

const b64url = (s: string | Buffer) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function mintJwt(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${b64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: mintJwt(sa),
    }),
  });
  if (!res.ok) throw new Error(`fcm_oauth_failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return json.access_token;
}

/**
 * Send a push to every registered device of a profile. Returns delivered count.
 * No FIREBASE_SERVICE_ACCOUNT_JSON env → logs and no-ops. Dead tokens are pruned.
 */
export async function sendPush(
  db: SupabaseClient,
  profileId: string,
  notification: { title: string; body: string; data?: Record<string, string> },
): Promise<number> {
  const { data: tokens } = await db
    .from('fcm_tokens')
    .select('token')
    .eq('profile_id', profileId);
  if (!tokens?.length) return 0;

  const sa = getServiceAccount();
  if (!sa) {
    console.warn(
      `[urban-assist] FCM service account missing — would push to ${tokens.length} tokens`,
      notification,
    );
    return 0;
  }

  const accessToken = await getAccessToken(sa);
  const link = notification.data?.link;
  let delivered = 0;
  for (const { token } of tokens) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: notification.title, body: notification.body },
            data: notification.data ?? {},
            ...(link ? { webpush: { fcm_options: { link } } } : {}),
          },
        }),
      },
    );
    if (res.ok) {
      delivered++;
    } else if (res.status === 404 || res.status === 400) {
      // UNREGISTERED / INVALID_ARGUMENT — token is dead, prune it
      await db.from('fcm_tokens').delete().eq('token', token);
    } else {
      console.warn(`[urban-assist] FCM send failed: ${res.status} ${await res.text()}`);
    }
  }
  return delivered;
}
