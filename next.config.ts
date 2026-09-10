import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自前のサーバー(nginx)で配るため、HTML/CSS/JS に書き出す。
  // out/ ができるので、それをそのまま置けば動く。Node もpm2 も要らない。
  output: "export",

  // 静的書き出しでは、既定の画像最適化(サーバーで変換するしくみ)が使えない。
  // 牌の画像は public/ に置いた小さな素材で、変換する必要が無いのでそのまま配る。
  images: { unoptimized: true },
};

export default nextConfig;
