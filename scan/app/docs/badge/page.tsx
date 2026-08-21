import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";

export const metadata: Metadata = docMeta("badge");

export default function BadgeDoc() {
  return (
    <DocsShell kicker="BADGE" title="Embed the Fridge badge">
      <p>
        The badge shows ticker plus a live scan link. Generate one at{" "}
        <a href="https://scan.devfridge.cool/badge">scan.devfridge.cool/badge</a>.
      </p>
      <p>
        Preview does not wait for a full scan. The image route is{" "}
        <code>/api/badge</code>. Click-through always opens{" "}
        <code>https://scan.devfridge.cool/t/&lt;mint&gt;</code> in a new tab.
      </p>
    </DocsShell>
  );
}
