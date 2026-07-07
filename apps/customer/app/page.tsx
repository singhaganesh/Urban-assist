import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { CategoryGrid } from '../components/category-grid';
import { PromoCarousel } from '../components/promo-carousel';
import { FeaturedServices } from '../components/featured-services';
import { WhyUs } from '../components/why-us';
import { Testimonials } from '../components/testimonials';
import { AppCTA } from '../components/app-cta';
import { Footer } from '../components/footer';

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CategoryGrid />
        <PromoCarousel />
        <FeaturedServices />
        <WhyUs />
        <Testimonials />
        <AppCTA />
      </main>
      <Footer />
    </>
  );
}
