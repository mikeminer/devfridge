import Link from "next/link";

export default function SiteNav() {
  return (
    <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        <img
          src="https://devfridge.cool/brand/logo-mark.jpg"
          alt=""
          className="h-8 w-8 rounded-lg object-cover"
        />
        <span className="text-xs font-bold tracking-[0.18em] text-ice">SCAN</span>
      </Link>
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <Link className="text-mute hover:text-ice" href="/">
          Scanner
        </Link>
        <Link className="text-mute hover:text-ice" href="/badge">
          Badge
        </Link>
        <a className="text-mute hover:text-ice" href="https://devfridge.cool">
          Fridge
        </a>
      </div>
    </nav>
  );
}
