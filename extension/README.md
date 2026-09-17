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
    name: React Functional Component
    detail: Create Functional Component
    template: true

    @Body
        import type { JSX } from "react"

        export default function ${TM_FILENAME_BASE/(.*)/${1:/capitalize}/}(): JSX.Element {
            return (
                $0
            )
        }
```

This extension provides editor support for the language: it does not compile anything (that is handled by the `viken` package CLI) — it simply makes `.vk`/`.viken` files pleasant to edit.

## **Features**

### **🎨 File Icon**

`.vk` and `.viken` files appear with the Viken icon in the Explorer, tabs, and breadcrumbs — even when using icon themes that do not know about the language. The icon is used as a fallback whenever the active theme does not define its own icon for `viken`.

### **✨ Syntax Highlighting**

- **Directives** (`@Header`, `@Snippet`, `@Body`): only the `@` receives a highlight color; the directive name retains the theme's default text color.
- **Properties** (`scope:`, `output:`, `prefix:`, `name:`, `detail:`, `template:`): the key is highlighted, and `true`/`false` are recognized as booleans.
- **VS Code snippet placeholders** inside `@Body`: `$0`, `$1`, `${1:label}`, `${TM_FILENAME_BASE/.../.../}` (1 level of nesting).
- **Code inside `@Body`**, according to the actual language declared in `scope:` — see the [@Body Highlighting](#body-highlighting) section below, as this has an important limitation worth understanding.
- Line comments using `#` outside `@Body` (same rule as the compiler).

### **💡 IntelliSense**

- Typing `@` suggests **only the directives that are valid at that point in the file**:
  - `@Header` disappears from the list if the file already contains one (only one can exist).
  - `@Body` only appears inside an `@Snippet` that does not yet have a body.
  - Inside the body code itself (e.g., a TypeScript decorator such as `@Component()`), nothing is suggested — there `@` is code syntax, not a Viken directive.
- On an empty line inside `@Header`/`@Snippet`, valid properties for that block are suggested.
- After `scope:`, a curated list of common VS Code language IDs is suggested. After `template:`, only `true`/`false` are suggested.
- **Hover**: hovering over a directive or property explains what it does and which field of the VS Code snippet schema it maps to.

## **@Body Highlighting**

A snippet body can be written in any language — that is the purpose of `scope:`. However, the TextMate grammar used by VS Code (`syntaxes/viken.tmLanguage.json`) **cannot** dynamically choose which language to embed based on a value declared in another block of the same file. TextMate has no concept of a "variable" that carries across blocks; each `begin`/`end` scope forgets what it read previously once it closes.

For this reason, `@Body` highlighting has two layers:

1. **Base (TextMate grammar)**: embeds the TSX grammar (`source.tsx`) as generic highlighting. This works reasonably well for languages similar to JS/TS/C, but it is not "correct" for Python, Ruby, Lua, etc.

2. **Semantic (`SemanticTokensProvider`, in `src/extension.ts` + `src/bodyTokenizer.ts`)**: reads the actual `scope:` from the file and tokenizes `@Body` according to the declared language family — correcting comments, strings, and a curated set of common keywords for:

   | Family | Comment | Languages (`scope:`)                                                                                                                   |
   | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
   | C-like | `//`    | `typescript`, `typescriptreact`, `javascript`, `javascriptreact`, `java`, `c`, `cpp`, `csharp`, `go`, `rust`, `kotlin`, `swift`, `php` |
   | Hash   | `#`     | `python`, `ruby`, `perl`                                                                                                               |
   | Dash   | `--`    | `lua`                                                                                                                                  |

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

## **Suggested Next Steps**

- Diagnostics (squiggles) by reusing the `parseViken` function from the `viken` package as a dependency, to report syntax errors in real time instead of only when compiling through the CLI.
- Expand `SCOPE_FAMILY`/keywords in `src/bodyTokenizer.ts` to support more languages or more complete keyword lists.
- Recognize multi-line strings/comments (template literals, triple-quoted docstrings) in the semantic tokenizer — currently it works line by line.
- Add a VS Code snippet to bootstrap a new `.vk` file (`@Header` + `@Snippet` + `@Body` with placeholders already included).

## **License**

MIT — same license as the `viken` package.
