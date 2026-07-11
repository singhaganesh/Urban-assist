import { getCategoryIcon, type Category } from '../../lib/services-data';

// Sticky jump-nav. Pure anchor links (#slug) — no JS needed, so this stays a
// server component. CategorySection renders matching id + scroll-mt for offset.
export function CategoryTabs({ categories }: { categories: Category[] }) {
  return (
    <nav className="sticky top-0 z-30 -mx-4 border-b border-hairline bg-bg/90 px-4 py-2 backdrop-blur lg:top-[57px]">
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {categories.map((c) => {
          const Icon = getCategoryIcon(c.icon);
          return (
            <a
              key={c.id}
              href={`#${c.slug}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              <Icon className="h-3.5 w-3.5" />
              {c.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
