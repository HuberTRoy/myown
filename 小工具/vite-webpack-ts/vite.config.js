import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import htmlTemplate from "vite-plugin-html-template";
import EnvironmentPlugin from "vite-plugin-environment";
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
      store: "/src/store",
    },
  },
  plugins: [
    vue(),
    htmlTemplate(),
    EnvironmentPlugin("all", { prefix: "VUE_APP_" }),
    AutoImport({
      imports: ["vue", "vue-router"],
      eslintrc: {
        enabled: true,
      },
      dts: "./src/types/auto-imports.d.ts",
    }),
  ],
});
