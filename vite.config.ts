import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const singleFile = process.env.SINGLE_FILE === "1";

const config = defineConfig({
  define: singleFile
    ? { "import.meta.env.VITE_SINGLE_FILE": JSON.stringify("1") }
    : undefined,
  resolve: { tsconfigPaths: true },
  // Le piping serveur → navigateur des devtools TanStack et le forwarding
  // navigateur → serveur de Vite se renvoient les logs à l'infini (OOM).
  server: { forwardConsole: false },
  plugins: [
    ...(singleFile ? [] : [devtools()]),
    tailwindcss(),
    tanstackStart(
      singleFile
        ? {
            spa: {
              enabled: true,
              prerender: { outputPath: "/index.html" },
            },
          }
        : {},
    ),
    viteReact(),
    ...(singleFile
      ? [
          {
            name: "singlefile-client-config",
            configEnvironment(name: string) {
              if (name !== "client") return;
              return {
                base: "./",
                build: {
                  assetsInlineLimit: 1_000_000,
                  assetsDir: "",
                  chunkSizeWarningLimit: 100_000_000,
                  cssCodeSplit: false,
                  rollupOptions: {
                    output: {
                      codeSplitting: false,
                    },
                  },
                },
              };
            },
          },
          viteSingleFile({
            useRecommendedBuildConfig: false,
            removeViteModuleLoader: true,
          }),
        ]
      : []),
  ],
});

export default config;
