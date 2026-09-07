import { DOC_PAGES, DOCS_ORIGIN } from "@/lib/docs";
import { PASTA_MINT } from "@/lib/constants";

export default function DocsShell({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">DOCS.DEVFRIDGE.COOL</p>
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="ice-card h-fit p-4 text-sm">
          <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-ice">DOCS</p>
          <ul className="grid gap-1">
            {DOC_PAGES.map((p) => (
              <li key={p.href}>
                <a className="block rounded-lg px-2 py-1.5 text-mute hover:bg-white/5 hover:text-ice" href={`${DOCS_ORIGIN}${p.href === "/" ? "" : p.href}`}>
                  {p.nav}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0">
          {kicker && (
            <p className="text-[10px] font-bold tracking-[0.2em] text-ice">{kicker}</p>
          )}
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-4 break-words text-xs text-mute">
            DevFridge $PASTA · Solana mint:{" "}
            <a className="break-all text-ice hover:underline" href={`${DOCS_ORIGIN}/program`}>
              <code>{PASTA_MINT}</code>
            </a>
            {" · Ticker ≠ identity."}
          </p>
          <div className="docs-prose mt-6">{children}</div>
        </article>
      </div>
      <footer className="mt-12 text-center text-xs text-mute">
        <a className="text-ice hover:underline" href="https://devfridge.cool">
          Fridge
        </a>
        {" · "}
        <a className="text-ice hover:underline" href="https://scan.devfridge.cool">
          Scanner
        </a>
        {" · "}
        <a className="text-ice hover:underline" href="https://scan.devfridge.cool/#feature">
          Get featured
        </a>
        {" · "}
        Too many tokens? Fridge them.
      </footer>
    </main>
  );
}
