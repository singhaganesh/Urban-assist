import Link from 'next/link';
import { Grid3X3, ArrowRight } from 'lucide-react';

// Reusable "All Services" CTA → the public taxonomy browse page.
export function AllServicesButton({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/services"
      className={`inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-accent-hover ${className}`}
    >
      <Grid3X3 className="h-4 w-4" />
      All Services
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
