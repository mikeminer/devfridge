import styles from "./ecosystem.module.css";

const STEPS = [
  { k: "Semolina", v: "Token supply — the substrate, not a cash-flow claim." },
  { k: "Water + energy", v: "External inputs: users, work, revenue, integrations." },
  { k: "Recipe", v: "Protocol rules for utility, locks, and burns." },
  { k: "Kitchen", v: "This map. Products that coordinate production." },
  { k: "Cooking time", v: "A timelock turns a balance into observable commitment." },
  { k: "Chefs", v: "Contributors convert resources into useful products." },
  { k: "Dishes", v: "Scanner, vault, SDK, badges, bot, World." },
  { k: "Diners", v: "Demand is validated by actual use, not circulation in an empty pot." },
];

export default function AlDente() {
  return (
    <div className="grid gap-6">
      <section className="ice-card p-6">
        <p className={styles.kicker}>Al dente economy</p>
        <h1 className="mt-2 text-4xl font-bold">$PASTA does not grow in an empty pot.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">
          Dry pasta absorbs water and energy from outside the system. A token ecosystem is the same:
          it has to absorb utility, labour, and adoption, then turn those into services people use.
          Locks and burns change liquid supply. They do not, by themselves, set a price.
        </p>
        <p className="mt-3 text-sm text-caution">
          This page is a kitchen reading of the model. It is not a valuation, not financial advice,
          and not a promise of appreciation.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="fridge-key fridge-key-primary" href="https://pasta.devfridge.cool">
            Full working paper
          </a>
          <a className="fridge-key" href="https://docs.devfridge.cool/tokenomics">
            On-chain tokenomics
          </a>
          <a className="fridge-key" href="https://docs.devfridge.cool/program">
            Program & mint
          </a>
        </div>
      </section>
      <div className={styles.aldente}>
        {STEPS.map((s) => (
          <article key={s.k} className="ice-card p-4">
            <p className="text-[10px] font-bold tracking-[0.16em] text-ice">{s.k.toUpperCase()}</p>
            <p className="mt-2 text-sm text-ink">{s.v}</p>
          </article>
        ))}
      </div>
      <section className="ice-card p-5">
        <h2 className="text-xl font-bold">What must be true</h2>
        <ul className="mt-3 grid gap-2 text-sm text-mute">
          <li>Products solve problems for people who are not buying only to speculate.</li>
          <li>Burns and locks stay auditable. Missing data stays “not collected.”</li>
          <li>Price and market cap are not marketing KPIs and do not headline this kitchen.</li>
        </ul>
      </section>
    </div>
  );
}
