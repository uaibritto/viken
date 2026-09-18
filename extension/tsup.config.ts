import { defineConfig } from "tsup"

export default defineConfig({
    entry: { extension: "src/extension.ts" },
    format: ["cjs"],
    external: ["vscode"],
    target: "node18",
    sourcemap: true,
    clean: true,
    dts: false
})
