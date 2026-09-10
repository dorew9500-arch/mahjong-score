import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// ★静的書き出し(output: "export")では、これが要る。
//   付けないと「ビルド時に決まらないかもしれない」と判断されてビルドが止まる。
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
