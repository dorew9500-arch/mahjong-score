import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mahjong-score-iota.vercel.app";
  return [
    { url: base, priority: 1.0 },
    { url: `${base}/calculator`, priority: 0.9 },
    { url: `${base}/table`, priority: 0.8 },
    { url: `${base}/quiz/wait`, priority: 0.7 },
    { url: `${base}/scoreboard`, priority: 0.6 },
  ];
}
