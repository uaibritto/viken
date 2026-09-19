<div align="center">

  <img src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/fNW3ES4fLd/original" width="120" height="120" alt="Viken Icon" />

  <h3>Viken</h3>

DSL and compiler to generate VS Code snippet files (`.code-snippets` / `snippets/*.json`) from `.vk`/`.viken` files.

</div>

</br>

> Part of the [Viken monorepo](../../README.md), which also contains the [VS Code/Cursor extension](../extension).

## Installation

```bash
npm install --save-dev @vikyn/viken
```

## Quick start

Create a `.vk` (or `.viken`) file:

```viken
@Header
    scope: typescriptreact
    output: react/tsx.json

@Const fileNameBase = ${TM_FILENAME_BASE/(.*)/${1:/capitalize}/}

@Snippet
    name: "React Functional Component"
    prefix: rfc
    detail: "Create Functional Component"
    template: true

    @Body
        import type { JSX } from "react"

        export default function fileNameBase(): JSX.Element {
            return (
                $0
            )
        }
```

Add to `package.json`:

```json
{
    "scripts": {
        "compile": "viken compile snippets"
    }
}
```

Run:

```bash
npm run compile
```

Compiles every `.vk`/`.viken` file found **recursively** inside `snippets/` (or the given path), and writes the JSON file(s) defined by each file's `output`.

## CLI

```bash
viken compile [path]
```

- `path` — directory or file. Default: `snippets`. Directories are searched recursively (`node_modules` and hidden directories are skipped), so nested files like `snippets/web/react/tsx.vk` are picked up automatically — no need to point the command at the nested folder.

## Output path resolution

`output` (declared in `@Header`) is always resolved **relative to the project root** — i.e. the directory you run `viken compile` from (`process.cwd()`) — regardless of where the `.vk`/`.viken` source file itself lives. So a file at `snippets/web/react/tsx.vk` with `output: react/tsx.json` writes to `<project root>/react/tsx.json`, not `snippets/web/react/react/tsx.json`.

For safety, an `output` that would resolve outside the project root (e.g. via `../../` traversal) is rejected with an error, so a `.vk` file — including one you didn't author yourself — can't be used to overwrite arbitrary files on disk.

## DSL syntax

One `@Header` and one or more `@Snippet` blocks per file, plus any number of `@Const` declarations.

### `@Header`

| Key      | Required | Description                                        |
| -------- | -------- | -------------------------------------------------- |
| `scope`  | yes      | Target language(s) (VS Code `scope`)               |
| `output` | yes      | Output JSON path, relative to the **project root** |

### `@Const`

```viken
@Const <name> = <value>
```

A single-line, file-wide text macro. `<value>` (optionally wrapped in double quotes, same rule as other properties) is substituted, as a **whole word**, everywhere it appears inside any `@Body` that comes **after** the `@Const` line — so declare a const before the snippet(s) that use it. This is meant for repetitive placeholder expressions you don't want to retype in every snippet, e.g.:

```viken
@Const fileNameBase = ${TM_FILENAME_BASE/(.*)/${1:/capitalize}/}
```

Then, inside `@Body`, just write `fileNameBase` instead of the full placeholder expression.

Notes:

- `@Const` names must be valid identifiers (`[A-Za-z_][A-Za-z0-9_]*`) and can't be declared twice in the same file.
- Substitution is purely textual (word-boundary find & replace), not scoped or hygienic — it does **not** know the difference between your placeholder and a real identifier that happens to have the same name. Pick distinctive const names to avoid accidental collisions with real code in `@Body`.
- Consts don't expand recursively: if one const's value contains another const's name, it is not itself substituted.
- `@Const` only affects `@Body` — it has no effect on `name`/`prefix`/`detail`/`scope`/`output`.

### `@Snippet`

| Key        | Required | Description                    |
| ---------- | -------- | ------------------------------ |
| `name`     | yes      | Snippet name/key               |
| `prefix`   | yes      | Trigger                        |
| `detail`   | no       | Description in autocomplete    |
| `template` | no       | `true`/`false` — file template |

### Quoting values

Any property value (and `@Const` value) may optionally be wrapped in double quotes, e.g. `name: "React Functional Component"`. The quotes are stripped by the parser. This is recommended for `name`/`detail` whenever the text contains a word that could be mistaken for a code keyword (`function`, `class`, `return`, etc.). Values without quotes keep working exactly as before.

### `@Body`

Content is copied literally (minimum common indentation stripped, then any `@Const` declared earlier in the file is substituted). Use standard VS Code placeholders (`$0`, `$1`, `${TM_FILENAME_BASE}`, etc).

### Comments

Lines starting with `#` are ignored in `@Header`/`@Snippet`. Inside `@Body` they are literal.

Multiple `@Snippet` blocks in one file share the header `scope` and any `@Const` declared before them.

## Editor support

For syntax highlighting and IntelliSense on `.vk`/`.viken` files in VS Code or Cursor, install the **Viken** extension from the marketplace (search for “Viken” or `@vikyn/viken`). `@Const` highlighting/IntelliSense in the extension is not implemented yet — see its own changelog.

## Changelog

### 0.2.0

- Added: `@Const <name> = <value>` — a file-wide text macro, substituted by whole word inside every `@Body` that follows its declaration. See the [`@Const`](#const) section above for details and limitations.
- Moved to a monorepo (`packages/viken`, alongside `packages/extension`). No change for consumers of the published `@vikyn/viken` package — `bin`, `files`, and the CLI's behavior are unaffected.
- Build now uses [tsdown](https://tsdown.dev/) (Rolldown-based) instead of tsup. No output change expected; if you build from source, `tsdown` replaces `tsup` as the dev dependency and `tsdown.config.ts` replaces `tsup.config.ts`.

### 0.1.4

- Fixed: `viken compile <dir>` now searches directories **recursively** for `.vk`/`.viken` files instead of only the top level.
- Fixed: `output` (from `@Header`) is now resolved relative to the **project root** (where the command is run), not relative to the source file's own directory.
- Added: property values (`name`, `detail`, `prefix`, `scope`, `output`) can be wrapped in double quotes, avoiding future syntax-highlighting ambiguity when a value contains a word like `function`.
- Added: guard against `output` paths that resolve outside the project root.
- Improved: a parse/compile error in one file no longer aborts the whole batch — other files still compile, and the command exits with a non-zero status if any file failed.
- Improved: file extension matching (`.vk`/`.viken`) is now case-insensitive.

## License

MIT
