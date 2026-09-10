import { ecoHref, NAV } from "@/lib/ecosystem";

export default function EcosystemNav({ host, embed }: { host: string; embed?: boolean }) {
  if (embed) return null;
  return (
    <header className="fridge-topbar">
      <nav className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <a href={ecoHref(host)} className="flex shrink-0 items-center gap-2">
          <img
            src="https://devfridge.cool/brand/logo-mark.jpg"
            alt=""
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-ice/30"
          />
          <span className="text-xs font-bold tracking-[0.18em] text-ice">ECOSYSTEM</span>
        </a>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {NAV.map((item) => (
            <a key={item.slug || "home"} className="fridge-key justify-center" href={ecoHref(host, item.slug)}>
              {item.label}
            </a>
          ))}
          <a className="fridge-key justify-center" href="https://connect.devfridge.cool">
            Connect
          </a>
          <a className="fridge-key fridge-key-primary justify-center" href="https://devfridge.cool">
            Fridge
          </a>
        </div>
      </nav>
    </header>
  );
}
