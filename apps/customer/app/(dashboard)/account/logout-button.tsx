'use client';
import { Button } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await supabase().auth.signOut();
        router.replace('/login');
      }}
    >
      Sign out
    </Button>
  );
}

