import type { Metadata } from "next";
import IntegrityFooter from "@/components/ecosystem/IntegrityFooter";
import { ECO_ORIGIN, ecoHref } from "@/lib/ecosystem";
import { headers } from "next/headers";
import styles from "@/components/ecosystem/ecosystem.module.css";

export const metadata: Metadata = {
  title: "Integrate the kitchen",
  description:
    "DevFridge SDK, Fridge badge, Telegram bot, listing kit, machine graph, and embeddable kitchen widget. SDK community pilot is proposed, not achieved.",
  alternates: { canonical: `${ECO_ORIGIN}/integrate` },
};

const ITEMS = [
  {
    title: "SDK",
    status: "Proposed pilot",
    body: "Gate a site with Fridge timelocks. Configure mint, amount, duration, renewal. No paying customers are claimed here.",
    href: "https://sdk.devfridge.cool",
    cta: "SDK docs",
  },
  {
    title: "Badge",
    status: "Live",
    body: "Embed a live Fridge badge that links to the scan. Not a safety certificate.",
    href: "https://scan.devfridge.cool/badge",
    cta: "Badge generator",
  },
  {
    title: "Telegram bot",
    status: "Live",
    body: "@frigopastabot — free /scan, /fridge, /badge, expiry alerts. Product, not a posting channel.",
    href: "https://bot.devfridge.cool",
    cta: "Bot landing",
  },
  {
    title: "Listing kit",
    status: "Live",
    body: "Verified links, descriptions, and assets for directories. A listing is not an endorsement.",
    href: "https://docs.devfridge.cool/listing-kit",
    cta: "Listing kit",
  },
];

export default function IntegratePage() {
  const host = headers().get("host") || "";
  const graph = ecoHref(host, "graph.json");
  const llms = ecoHref(host, "llms.txt");
  const embed = ecoHref(host, "embed?node=fridge");
  return (
    <div className={`${styles.shell} mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-12`}>
      <p className={styles.kicker}>INTEGRATE</p>
      <header>
        <h1 className="text-4xl font-bold sm:text-5xl">Build on the vault. Keep the claims honest.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          Agents should read Synapse. Humans should ship a working product. The 90-day SDK pilot is a
          proposal: one useful integration, then evidence of repeat use. Stretch target of 40
          independently attributed wallets is not achieved and not guaranteed.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <article key={item.title} className="ice-card p-5">
            <p className="text-[10px] font-bold tracking-[0.16em] text-ice">{item.status.toUpperCase()}</p>
            <h2 className="mt-1 text-xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-mute">{item.body}</p>
            <a className="fridge-key mt-4 inline-flex" href={item.href}>
              {item.cta}
            </a>
          </article>
        ))}
      </div>
      <section className="ice-card p-5">
        <h2 className="text-xl font-bold">Machine doors</h2>
        <p className="mt-2 text-sm text-mute">
          The UI renders this graph. If Synapse and the UI disagree, Synapse wins and the number is
          labeled.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="fridge-key fridge-key-primary" href={graph}>
            graph.json
          </a>
          <a className="fridge-key" href={llms}>
            llms.txt
          </a>
          <a className="fridge-key" href={embed}>
            Embed Fridge node
          </a>
          <a className="fridge-key" href="https://synapse.devfridge.cool/llms.txt">
            Synapse llms.txt
          </a>
        </div>
      </section>
      <IntegrityFooter />
    </div>
  );
}
