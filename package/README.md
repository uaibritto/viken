<div align="center">

  <img src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/fNW3ES4fLd/original" width="120" height="120" alt="Viken Icon" />

  <h3>Viken</h3>

DSL and compiler to generate VS Code snippet files (`.code-snippets` / `snippets/*.json`) from `.vk`/`.viken` files.

</div>

</br>

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

@Snippet
    name: React Functional Component
    prefix: rfc
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

Compiles every `.vk`/`.viken` in `snippets/` (or the given path) and writes the JSON files defined by each file’s `output` (relative to the `.vk` file).

## CLI

```bash
viken compile [path]
```

- `path` — directory or file. Default: `snippets`.

## Editor support

For syntax highlighting and IntelliSense on `.vk`/`.viken` files in VS Code or Cursor, install the **Viken** extension from the marketplace (search for “Viken” or `@vikyn/viken`).

## DSL syntax

One `@Header` and one or more `@Snippet` blocks per file.

### `@Header`

| Key      | Required | Description                                  |
| -------- | -------- | -------------------------------------------- |
| `scope`  | yes      | Target language(s) (VS Code `scope`)         |
| `output` | yes      | Output JSON path, relative to the `.vk` file |

### `@Snippet`

| Key        | Required | Description                    |
| ---------- | -------- | ------------------------------ |
| `name`     | yes      | Snippet name/key               |
| `prefix`   | yes      | Trigger                        |
| `detail`   | no       | Description in autocomplete    |
| `template` | no       | `true`/`false` — file template |

### `@Body`

Content is copied literally (minimum common indentation stripped). Use standard VS Code placeholders (`$0`, `$1`, `${TM_FILENAME_BASE}`, etc).

### Comments

Lines starting with `#` are ignored in `@Header`/`@Snippet`. Inside `@Body` they are literal.

Multiple `@Snippet` blocks in one file share the header `scope`.

## License

MIT
