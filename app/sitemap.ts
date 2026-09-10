import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// ★静的書き出し(output: "export")では、これが要る。robots.ts と同じ理由。
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1.0 },
    { url: `${SITE_URL}/calculator`, priority: 0.9 },
    { url: `${SITE_URL}/table`, priority: 0.8 },
    { url: `${SITE_URL}/quiz/wait`, priority: 0.7 },
    { url: `${SITE_URL}/scoreboard`, priority: 0.6 },
  ];
}
