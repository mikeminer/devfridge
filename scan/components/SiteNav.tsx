export default function SiteNav() {
  return (
    <header className="fridge-topbar">
      <nav className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <a href="https://scan.devfridge.cool" className="flex shrink-0 items-center gap-2">
          <img
            src="https://devfridge.cool/brand/logo-mark.jpg"
            alt=""
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-ice/30"
          />
          <span className="text-xs font-bold tracking-[0.18em] text-ice">SCAN</span>
        </a>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <a className="fridge-key justify-center" href="https://scan.devfridge.cool">
            Scanner
          </a>
          <a className="fridge-key justify-center" href="https://scan.devfridge.cool/#feature">
            Featured
          </a>
          <a className="fridge-key justify-center" href="https://scan.devfridge.cool/badge">
            Badge
          </a>
          <a className="fridge-key justify-center" href="https://world.devfridge.cool">
            World
          </a>
          <a className="fridge-key justify-center" href="https://docs.devfridge.cool">
            Docs
          </a>
          <a className="fridge-key justify-center" href="https://health.devfridge.cool">
            Health
          </a>
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
