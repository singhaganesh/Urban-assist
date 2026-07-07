import { Wrench, Sparkles, PaintBucket, Bug, Zap, Shirt, Wind, Shovel } from 'lucide-react';

const quickTiles = [
  { icon: Sparkles, label: 'Cleaning', color: '#6B8F6B', time: '30 min' },
  { icon: Wrench, label: 'Repair & Installation', color: '#C1622E', time: '45 min' },
  { icon: PaintBucket, label: 'Painting', color: '#1F3A4D', time: '1 hr' },
  { icon: Bug, label: 'Pest Control', color: '#B23A2E', time: '30 min' },
  { icon: Zap, label: 'Electrical', color: '#D9A441', time: '45 min' },
  { icon: Shirt, label: 'Laundry', color: '#6B8F6B', time: '2 hr' },
  { icon: Wind, label: 'AC & Appliance Repair', color: '#C1622E', time: '1 hr' },
  { icon: Shovel, label: 'Gardening', color: '#1F3A4D', time: '1 hr' },
];

export function Hero() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-page px-6">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-16">
          {/* Left: text + quick tiles */}
          <div className="flex-1">
            <h1 className="text-[44px] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink">
              Home services<br />at your doorstep
            </h1>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
              Book trusted professionals for cleaning, repairs, installation, and more.
              Verified providers, transparent pricing, hassle-free.
            </p>

            {/* Quick-tile grid (2x4) */}
            <div className="mt-8">
              <h2 className="mb-4 text-[15px] font-bold text-ink">What are you looking for?</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <a
                      key={tile.label}
                      href={`/services?category=${tile.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-input-border bg-white p-4 text-center transition hover:border-accent"
                      style={{ background: 'white' }}
                    >
                      <span
                        className="grid h-10 w-10 place-items-center rounded-lg"
                        style={{ background: `${tile.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: tile.color }} />
                      </span>
                      <span className="text-[12px] font-semibold leading-tight text-ink">
                        {tile.label}
                      </span>
                      <span className="text-[11px] font-medium text-success">{tile.time}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: collage placeholder (blank) */}
          <div className="hidden w-full max-w-md lg:block">
            <div className="flex h-[420px] w-full items-center justify-center rounded-[18px] bg-hairline/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
