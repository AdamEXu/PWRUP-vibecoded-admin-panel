import Link from "next/link";
import { Monitor, PanelsTopLeft } from "lucide-react";

const destinations = [
  {
    href: "/hud",
    title: "HUD",
    description: "Open the competition HUD display.",
    icon: Monitor,
  },
  {
    href: "/touchscreen",
    title: "Touchscreen Dashboard",
    description: "Open the driver touchscreen controls.",
    icon: PanelsTopLeft,
  },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(112,205,53,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#70cd35] to-transparent opacity-70" />

      <section className="relative z-10 w-full max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_120px_rgba(0,0,0,0.55)] backdrop-blur-sm md:p-10">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#70cd35]">
            PWRUP Competition
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Choose a display mode
          </h1>
          <p className="mt-3 text-base text-white/70 md:text-lg">
            Launch the match HUD or open the touchscreen dashboard from the same app shell.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {destinations.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-[24px] border border-white/10 bg-black/40 p-6 transition hover:border-[#70cd35]/60 hover:bg-[#70cd35]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70cd35]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">{description}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[#70cd35] transition group-hover:border-[#70cd35]/50 group-hover:bg-[#70cd35]/15">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-8 flex items-center text-sm font-medium text-white/80">
                Open
                <span className="ml-2 transition group-hover:translate-x-1">{"->"}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
