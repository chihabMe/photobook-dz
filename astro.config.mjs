// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  integrations: [tailwind(), react()],
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en", "ar"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});