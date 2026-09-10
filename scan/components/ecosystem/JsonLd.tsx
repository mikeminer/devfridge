import { ecoJsonLd } from "@/lib/ecosystem";

export default function JsonLd() {
  const json = JSON.stringify(ecoJsonLd());
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
