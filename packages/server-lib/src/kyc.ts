import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Automatically verify provider documents.
 * Returns true if the provider's documents meet requirements and status was updated to approved.
 */
export async function verifyProviderDocuments(
  db: SupabaseClient,
  providerId: string,
): Promise<{ success: boolean; status: 'pending' | 'approved' | 'rejected' }> {
  // Fetch all documents for this provider
  const { data: docs, error } = await db
    .from('provider_documents')
    .select('doc_type, expires_at')
    .eq('provider_id', providerId);

  if (error || !docs) {
    throw error ?? new Error('Documents not found');
  }

  const today = new Date();
  const validTypes = new Set<string>();

  for (const doc of docs) {
    // Basic automated check: not expired (if expiry is present)
    const notExpired = !doc.expires_at || new Date(doc.expires_at) > today;
    if (notExpired) {
      validTypes.add(doc.doc_type);
    }
  }

  // Required: 'id' and 'insurance'
  const isApproved = validTypes.has('id') && validTypes.has('insurance');

  // --- Hook for Real/External KYC Vendor ---
  // e.g. persona / jumio integration:
  // const kycResult = await personaClient.verifyUser(providerId);
  // const isApproved = kycResult.passed;
  // ------------------------------------------

  const newStatus = isApproved ? 'approved' : 'pending';

  const { error: updateErr } = await db
    .from('profiles')
    .update({ kyc_status: newStatus })
    .eq('id', providerId);

  if (updateErr) {
    throw updateErr;
  }

  return { success: isApproved, status: newStatus as any };
}
