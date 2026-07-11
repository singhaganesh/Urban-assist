import Link from 'next/link';
import { pence } from '@urban-assist/lib';
import { getCategoryIcon, type ServiceItem } from '../../lib/services-data';

interface ServiceCardProps {
  service: ServiceItem;
  categorySlug: string;
  /** Icon name to render (usually the parent subcategory's icon). */
  icon?: string;
}

export function ServiceCard({ service, categorySlug, icon }: ServiceCardProps) {
  const Icon = getCategoryIcon(service.icon ?? icon ?? 'sparkles');
  return (
    <Link
      href={`/services/${categorySlug}/${service.slug}`}
      className="card card-shadow group flex flex-col rounded-xl border border-hairline p-4 transition hover:border-accent"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/5">
        <Icon className="h-4 w-4 text-ink" />
      </span>
      <h4 className="mt-3 text-[14px] font-bold leading-tight text-ink">{service.name}</h4>
      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">{service.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">From {pence(service.minPricePence)}</span>
        {service.isPopular && (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-accent">
            Popular
          </span>
        )}
      </div>
    </Link>
  );
}
