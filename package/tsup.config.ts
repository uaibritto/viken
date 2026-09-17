import { defineConfig } from "tsup"

export default defineConfig([
    {
        entry: { "cli/index": "src/cli/index.ts" },
        format: ["esm"],
        dts: false,
        clean: true,
        target: "es2021",
        splitting: false,
        treeshake: true,
        minify: false,
        banner: { js: "#!/usr/bin/env node" }
    },
    {
        entry: {
            "core/ast": "src/core/ast.ts",
            "core/parser": "src/core/parser.ts",
            "core/compiler": "src/core/compiler.ts"
        },
        format: ["esm"],
        dts: false,
        clean: false, // não limpar o que o build da CLI acabou de gerar
        target: "es2021",
        splitting: false,
        treeshake: true,
        minify: false
    }
])
