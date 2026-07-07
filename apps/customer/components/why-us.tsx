import { BadgeCheck, PoundSterling, ShieldCheck, CalendarCheck } from 'lucide-react';

const reasons = [
  {
    icon: BadgeCheck,
    title: 'Background Verified Pros',
    desc: 'Every professional is ID-verified and background-checked.',
    color: '#6B8F6B',
  },
  {
    icon: PoundSterling,
    title: 'Transparent Pricing',
    desc: 'See the full price upfront. No hidden fees, no surprises.',
    color: '#6B8F6B',
  },
  {
    icon: ShieldCheck,
    title: 'Insurance Coverage',
    desc: 'All services are covered by public liability insurance.',
    color: '#6B8F6B',
  },
  {
    icon: CalendarCheck,
    title: 'Flexible Rescheduling',
    desc: 'Change your booking anytime with zero cancellation fees.',
    color: '#6B8F6B',
  },
];

export function WhyUs() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-page px-6">
        <h2 className="mb-8 text-center text-[26px] font-extrabold text-ink">
          Why choose Urban Assist?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="card-shadow card flex flex-col items-center rounded-xl p-6 text-center"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: `${r.color}15` }}>
                  <Icon className="h-7 w-7" style={{ color: r.color }} />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{r.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
