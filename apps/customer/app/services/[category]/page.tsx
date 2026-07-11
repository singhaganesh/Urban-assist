import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SERVICE_CATEGORIES, getCategoryBySlug } from '../../../lib/services-data';
import { Header } from '../../../components/header';
import { Footer } from '../../../components/footer';
import { SubcategoryBlock } from '../../../components/services/subcategory-block';
import { AllServicesButton } from '../../../components/services/all-services-button';

// Pre-render one static page per category from the taxonomy.
export function generateStaticParams() {
  return SERVICE_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: { params: { category: string } }) {
  const category = getCategoryBySlug(params.category);
  return {
    title: category ? `${category.name} · Urban Assist` : 'Services · Urban Assist',
    description: category?.description,
  };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const category = getCategoryBySlug(params.category);
  if (!category) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-16 pt-6 lg:px-6">
        <Link
          href="/services"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All services
        </Link>

        <div className="mb-8 mt-3">
          <h1 className="text-[26px] font-extrabold text-ink lg:text-[30px]">{category.name}</h1>
          <p className="mt-1 text-[14px] text-muted">{category.description}</p>
        </div>

        <div className="space-y-10">
          {category.subcategories.map((sub) => (
            <SubcategoryBlock key={sub.id} subcategory={sub} categorySlug={category.slug} />
          ))}
        </div>

        <div className="mt-12">
          <AllServicesButton />
        </div>
      </main>
      <Footer />
    </>
  );
}
