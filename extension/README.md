<div align="center">

  <img src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/KG8xaCnQ7S/original" width="120" height="120" alt="Viken Icon" />

  <h3>Viken</h3>

  <p>Syntax highlighting, IntelliSense, and file icon support for the <strong>Viken</strong> DSL </br>
  (<code>.vk</code> / <code>.viken</code>) — the language that compiles to VS Code snippets.</p>

</div>

</br>

## **What is Viken**

[Viken](https://github.com/uaibritto/viken) is a DSL that compiles `.vk`/`.viken` files into the VS Code snippet JSON format. A Viken file looks like this:

```viken

@Header
    scope: typescriptreact
    output: react/tsx.json

@Snippet
    prefix: rfc
    name: "React Functional Component"
    detail: "Create Functional Component"
    template: true

    @Body
        import type { JSX } from "react"

        export default function ${TM_FILENAME_BASE/(.*)/${1:/capitalize}/}(): JSX.Element {
            return (
                $0
            )
        }
```

A file has exactly one `@Header`, followed by as many `@Snippet` blocks as you want. `@Body` may only appear inside a `@Snippet`.

This extension provides editor support for the language: it does not compile anything (that is handled by the `viken` package CLI) — it simply makes `.vk`/`.viken` files pleasant to edit.

## **Editor compatibility**

Works in **VS Code** and **Cursor** (and any other VS Code-compatible editor) — the minimum required host version is VS Code `1.75.0` or later.

## **Features**

### **🎨 File Icon**

`.vk` and `.viken` files appear with the Viken icon in the Explorer, tabs, and breadcrumbs — even when using icon themes that do not know about the language. The icon is used as a fallback whenever the active theme does not define its own icon for `viken`.

### **✨ Syntax Highlighting**

- **Directives** (`@Header`, `@Snippet`, `@Body`): only the `@` receives a highlight color; the directive name retains the theme's default text color.
- **Properties** (`scope:`, `output:`, `prefix:`, `name:`, `detail:`, `template:`): the key is highlighted, and `true`/`false` are recognized as booleans.
- **Quoted string values**: `name: "React Functional Component"` (and `detail`, or any property) is highlighted as a proper string, with `\"` recognized as an escape sequence. Unquoted values still work exactly as before.
- **VS Code snippet placeholders** inside `@Body`: `$0`, `$1`, `${1:label}`, `${TM_FILENAME_BASE/.../.../}` (1 level of nesting).
- **Code inside `@Body`**, according to the actual language declared in `scope:` — see the [@Body Highlighting](#body-highlighting) section below, as this has an important limitation worth understanding.
- Line comments using `#` outside `@Body` (same rule as the compiler).
- Highlighting is consistent across every `@Header`/`@Snippet`/`@Body` block in a file — `@Header`, `@Snippet`, and `@Body` are independent, sibling blocks in the grammar, so a file with several `@Snippet` blocks colors every one of them identically.

### **💡 IntelliSense**

- Typing `@` suggests **only the directives that are valid at that point in the file**:
  - `@Header` disappears from the list if the file already contains one (only one can exist).
  - `@Snippet` is always suggested — a file can have as many as you want.
  - `@Body` only appears inside an `@Snippet` that does not yet have a body.
  - An unindented `@` (column 0) is always treated as the start of a new top-level block (`@Header`/`@Snippet`), even right after a previous snippet's `@Body` — so starting a second, third, etc. `@Snippet` always gets suggestions.
  - Inside the body code itself, indented (e.g., a TypeScript decorator such as `@Component()`), nothing is suggested — there `@` is code syntax, not a Viken directive.
- On an empty line inside `@Header`/`@Snippet`, valid properties for that block are suggested.
- After `scope:`, a curated list of common VS Code language IDs is suggested (including `tsrx` — see [tsrx.dev](https://tsrx.dev/)). After `template:`, only `true`/`false` are suggested.
- **Hover**: hovering over a directive or property explains what it does and which field of the VS Code snippet schema it maps to. The `output` hover reflects the compiler's current behavior: the path is resolved relative to the **project root**, not to the `.vk` file.

## **@Body Highlighting**

A snippet body can be written in any language — that is the purpose of `scope:`. However, the TextMate grammar used by VS Code (`syntaxes/viken.tmLanguage.json`) **cannot** dynamically choose which language to embed based on a value declared in another block of the same file. TextMate has no concept of a "variable" that carries across blocks; each `begin`/`end` scope forgets what it read previously once it closes.

For this reason, `@Body` highlighting has two layers:

1. **Base (TextMate grammar)**: embeds the TSX grammar (`source.tsx`) as generic highlighting. This works reasonably well for languages similar to JS/TS/C (including `tsrx`), but it is not "correct" for Python, Ruby, Lua, etc.

2. **Semantic (`SemanticTokensProvider`, in `src/extension.ts` + `src/bodyTokenizer.ts`)**: reads the actual `scope:` from the file and tokenizes `@Body` according to the declared language family — correcting comments, strings, and a curated set of common keywords for:

   | Family | Comment | Languages (`scope:`)                                                                                                                           |
   | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
   | C-like | `//`    | `typescript`, `typescriptreact`, `javascript`, `javascriptreact`, `tsrx`, `java`, `c`, `cpp`, `csharp`, `go`, `rust`, `kotlin`, `swift`, `php` |
   | Hash   | `#`     | `python`, `ruby`, `perl`                                                                                                                       |
   | Dash   | `--`    | `lua`                                                                                                                                          |

   `vue`, `svelte`, `html`, `json` (and any `scope:` outside the table) only use the base layer (generic TSX) — these are host/hybrid languages where a tokenizer for a single family would introduce more errors than it would solve.

**Intentional limitations, to keep things simple:**

- This is not a real parser for each language — it only classifies comments, strings, numbers, and a curated list of keywords. Expanding the list only requires editing the `SCOPE_FAMILY` object in `src/bodyTokenizer.ts`.
- Strings and comments are detected **line by line** — a multi-line template literal or a Python `"""..."""` docstring spanning multiple lines is not recognized correctly.

## **Installation (Development)**

```bash
npm install
npm run build      # generates dist/extension.js via tsup
```

### **Running in Dev Mode**

Open the folder in VS Code/Cursor and press `F5` (this opens an "Extension Development Host" with the extension loaded). If there is no `.vscode/launch.json`, create one pointing to this same directory.

### **Packaging (`.vsix`)**

```bash
npm run package
```

Generates a `.vsix` package that can be installed through **Extensions: Install from VSIX...** in VS Code/Cursor, or published to the Marketplace/Open VSX.

## **Project Structure**

```text
viken-vscode/
├── icons/
│   └── viken.svg                 icon used for .vk/.viken
├── syntaxes/
│   └── viken.tmLanguage.json     TextMate grammar (base highlighting)
├── src/
│   ├── extension.ts              completions, hover, semantic tokens
│   └── bodyTokenizer.ts          tokenizer by language family
├── language-configuration.json   comments, auto-closing pairs
├── package.json                  extension manifest
└── tsup.config.ts                bundling (esbuild) for dist/extension.js
```

## **Changelog**

### 0.1.1

- Fixed: `@Header`, `@Snippet`, and `@Body` are now independent, sibling blocks in the TextMate grammar instead of nested inside one another. Previously, `@Body` and its enclosing `@Snippet` ended on the exact same zero-width condition, which made the highlight of a snippet's metadata (`name`, `detail`, `prefix`...) inconsistent depending on where the snippet appeared in the file — with no actual error in the code.
- Fixed: typing `@` right after a previous snippet's `@Body` now correctly suggests `@Snippet`/`@Header` again. Previously, an unindented `@` was misclassified as "still inside the previous body" and no suggestions appeared, as if only one `@Snippet` were allowed per file (only `@Header` is limited to one).
- Fixed: `language-configuration.json` was misnamed (a dot instead of a hyphen) relative to what `package.json` expects, so bracket-matching, auto-closing pairs, and `#` comment toggling silently never loaded.
- Fixed: the `output` hover text was out of date — it now says the path is resolved relative to the **project root**, matching the `viken` compiler's current behavior (see the main package's changelog).
- Fixed: `engines.vscode` was set to a version newer than what Cursor currently ships, which made the extension fail to install there ("not compatible with the current version of Cursor"). Lowered to `^1.75.0`, which both current VS Code and Cursor satisfy.
- Added: quoted string values (`name: "..."`, `detail: "..."`, etc.) are now highlighted as proper strings, with `\"` recognized as an escape sequence — mirrors the quoting support added to the `viken` compiler.
- Added: `tsrx` (see [tsrx.dev](https://tsrx.dev/)) now also gets C-like semantic highlighting in `@Body` (comments, strings, keywords), instead of only the generic TSX base layer.
- Improved: the keyword `Set` used by the body tokenizer is now cached per language family instead of being rebuilt on every line, on every semantic-tokens refresh.

## **Suggested Next Steps**

- Diagnostics (squiggles) by reusing the `parseViken` function from the `viken` package as a dependency, to report syntax errors in real time instead of only when compiling through the CLI.
- Expand `SCOPE_FAMILY`/keywords in `src/bodyTokenizer.ts` to support more languages or more complete keyword lists.
- Recognize multi-line strings/comments (template literals, triple-quoted docstrings) in the semantic tokenizer — currently it works line by line.
- Add a VS Code snippet to bootstrap a new `.vk` file (`@Header` + `@Snippet` + `@Body` with placeholders already included).

## **License**

MIT — same license as the `viken` package.
