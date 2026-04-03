import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://mahjong-score-git-main-dorew9500-archs-projects.vercel.app/sitemap.xml",
  };
}
