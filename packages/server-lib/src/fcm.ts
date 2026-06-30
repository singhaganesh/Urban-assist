// FCM device-token registration + sender (server-side).
// The web-push side lives in apps/*/public/firebase-messaging-sw.js.

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

/**
 * Send a push to all tokens for a given profile.
 * Stubbed: requires FIREBASE_SERVICE_ACCOUNT_JSON to actually fire.
 * Returns the count of tokens it _would_ have sent to.
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

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    console.warn(
      `[homeease] FCM service account missing — would push to ${tokens.length} tokens`,
      notification,
    );
    return tokens.length;
  }

  // TODO: wire firebase-admin here when service account is provided.
  // import { initializeApp, cert, getApps } from 'firebase-admin/app';
  // import { getMessaging } from 'firebase-admin/messaging';
  // ...
  return tokens.length;
}
