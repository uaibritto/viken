<div align="center">
  <h3>Viken</h3>
  <p>Monorepo for the Viken DSL: a compiler that generates VS Code snippets from <code>.vk</code>/<code>.viken</code> files, and the editor extension for it.</p>
</div>

## Packages

- [`packages/viken`](./packages/viken) — [`@vikyn/viken`](https://www.npmjs.com/package/@vikyn/viken): the DSL compiler and CLI.
- [`packages/extension`](./packages/extension) — **Viken**: syntax highlighting, IntelliSense, and file icon support for `.vk`/`.viken` in VS Code and Cursor.

## Tooling

- **Package manager / workspaces**: [Bun](https://bun.sh/) workspaces (`workspaces` in the root `package.json`), one lockfile at the repo root.
- **Task runner**: [Turborepo](https://turbo.build/repo) (`turbo.json`) — `bun run build`, `bun run lint`, `bun run fmt`, etc. run the corresponding script in every package, cached and parallelized. Useful today for a single cached entry point across both packages, and sets up the dependency graph for when `packages/extension` starts importing `packages/viken` (e.g. for the diagnostics feature planned in the extension's own README).
- **Build**: [tsdown](https://tsdown.dev/) (Rolldown-based) in both packages, replacing tsup. Building requires Node 22.18+ locally/in CI; the compiled output still targets older Node versions per each package's own `target` — this only affects contributors building from source, not consumers of the published packages.
- **Lint/format**: `oxlint` / `oxfmt`, shared as root devDependencies instead of being duplicated per package.
- **Shared TypeScript config**: `tsconfig.base.json` at the root holds only the options that are genuinely identical between the two packages (`strict`, `noUncheckedIndexedAccess`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `skipLibCheck`). `module`/`moduleResolution`/`target` stay per-package on purpose — the compiler targets `bundler` resolution for its own build, while the extension targets `nodenext` to match how VS Code's extension host resolves modules.

## Getting started

```bash
bun install       # installs and links both packages from the single root lockfile
bun run build      # builds every package (turbo run build)
bun run lint        # lints every package
```

See each package's own README for usage instructions.
