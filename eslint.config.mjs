import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals.js", "next/typescript"),
  {
    rules: {
      // Loyiha ataylab <img> ishlatadi (blob/remote URL, next/image emas) — CLAUDE.md'da hujjatlangan.
      "@next/next/no-img-element": "off",
      // O'zbek tilida ' (tutuq belgisi) harf sifatida ishlatiladi (o', g', ...) —
      // bu qoida butun UI matniga qarshi kurashadi; matn JSX'da xavfsiz render bo'ladi.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
