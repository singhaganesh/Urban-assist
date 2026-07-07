const reviews = [
  {
    name: 'Sarah M.',
    location: 'London',
    rating: 5,
    text: 'The cleaning service was outstanding. Professional, punctual, and they left my flat spotless. Will definitely book again.',
  },
  {
    name: 'James K.',
    location: 'Manchester',
    rating: 5,
    text: 'Had my washing machine repaired within 2 hours of booking. The engineer was knowledgeable and friendly. Fair price too.',
  },
  {
    name: 'Priya R.',
    location: 'Birmingham',
    rating: 4,
    text: 'Great service for AC installation. The team was efficient and cleaned up after themselves. Slight delay but they communicated well.',
  },
];

export function Testimonials() {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <h2 className="mb-2 text-center text-[26px] font-extrabold text-ink">
          What our customers say
        </h2>
        <p className="mb-8 text-center text-[14px] text-muted">
          Trusted by thousands of UK households
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.name} className="card-shadow card rounded-xl p-6">
              <div className="text-[18px] tracking-[2px]" style={{ color: '#D9A441' }}>
                {stars(r.rating)}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink">{r.text}</p>
              <div className="mt-4 border-t border-hairline pt-3">
                <span className="text-[14px] font-bold text-ink">{r.name}</span>
                <span className="ml-2 text-[12px] text-muted">{r.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
