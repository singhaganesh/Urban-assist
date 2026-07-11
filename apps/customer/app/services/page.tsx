import { SERVICE_CATEGORIES } from '../../lib/services-data';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CategoryTabs } from '../../components/services/category-tabs';
import { CategorySection } from '../../components/services/category-section';
import { ServiceSearch } from '../../components/services/service-search';

export const metadata = {
  title: 'All Services · Urban Assist',
  description: 'Browse every home service category, room and job Urban Assist covers.',
};

// Static — the taxonomy is code, not a request-time DB read.
export default function AllServicesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-16 pt-6 lg:px-6">
        <div className="mb-6">
          <h1 className="text-[26px] font-extrabold text-ink lg:text-[30px]">All Services</h1>
          <p className="mt-1 text-[14px] text-muted">
            Browse every category, room and job we cover.
          </p>
          <div className="mt-4 max-w-xl">
            <ServiceSearch />
          </div>
        </div>

        <CategoryTabs categories={SERVICE_CATEGORIES} />

        <div className="mt-8 space-y-14">
          {SERVICE_CATEGORIES.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
