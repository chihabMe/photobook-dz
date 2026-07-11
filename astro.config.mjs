// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // `output: "static"` keeps all marketing content prerendered to HTML.
  // The order API (pages/api/order.ts) opts into on-demand rendering via
  // `export const prerender = false`, served by the Node adapter.
  output: "static",
  adapter: node({ mode: "standalone" }),
  integrations: [tailwind(), react()],
  server: { port: 4321 },
});
