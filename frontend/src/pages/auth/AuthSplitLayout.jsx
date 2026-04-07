export function AuthSplitLayout({ title, subtitle, children, footer = "Training & Placement Cell" }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        <div className="relative min-h-[320px] overflow-hidden bg-slate-950">
          <img
            src="/MVP-Nashik.png"
            alt="KBT College of Engineering campus"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.22)_0%,rgba(15,23,42,0.52)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <div className="max-w-lg">
              <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-white md:text-5xl">
                Empowering Futures
              </h1>
              <p className="mt-3 max-w-md text-lg leading-8 text-white/88">
                Streamlined placement management for KBT College of Engineering, Nashik.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-10 md:px-10">
          <div className="w-full max-w-[400px]">
            <div className="border border-slate-200 bg-white px-7 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:px-8 md:py-9">
              <div className="text-center">
                <h2 className="font-[var(--font-display)] text-[2rem] font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
                <p className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                  {subtitle}
                </p>
              </div>

              {children}
            </div>

            <div className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
