export type TokenType = "comment" | "string" | "number" | "keyword"

export interface Token {
  start: number
  length: number
  type: TokenType
}

export interface LanguageFamily {
  lineComment?: string
  stringDelimiters: string[]
  keywords: string[]
}

// Famílias por estilo de comentário/keyword. Não é um parser completo de cada
// linguagem — é um tokenizer simples o bastante pra colorir comentário, string
// e um conjunto curado de palavras-chave comuns, sem tentar validar sintaxe.
const C_FAMILY: LanguageFamily = {
  lineComment: "//",
  stringDelimiters: ['"', "'", "`"],
  keywords: [
    "function",
    "return",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "class",
    "interface",
    "type",
    "import",
    "export",
    "from",
    "new",
    "this",
    "extends",
    "implements",
    "public",
    "private",
    "protected",
    "static",
    "async",
    "await",
    "try",
    "catch",
    "finally",
    "switch",
    "case",
    "break",
    "continue",
    "default",
    "void",
    "null",
    "true",
    "false",
    "struct",
    "enum",
    "fn",
    "impl",
    "pub",
    "use",
    "mod",
    "package",
    "func",
    "defer",
    "chan",
    "namespace",
    "using",
    "override",
    "abstract",
    "readonly"
  ]
}

const HASH_FAMILY: LanguageFamily = {
  lineComment: "#",
  stringDelimiters: ['"', "'"],
  keywords: [
    "def",
    "return",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "class",
    "import",
    "from",
    "as",
    "try",
    "except",
    "finally",
    "with",
    "lambda",
    "yield",
    "pass",
    "break",
    "continue",
    "None",
    "True",
    "False",
    "self",
    "raise",
    "global",
    "nonlocal",
    "sub",
    "my",
    "use",
    "package",
    "require",
    "end",
    "do",
    "then",
    "module",
    "begin",
    "rescue",
    "puts",
    "print"
  ]
}

const DASH_FAMILY: LanguageFamily = {
  lineComment: "--",
  stringDelimiters: ['"', "'"],
  keywords: [
    "function",
    "local",
    "end",
    "if",
    "then",
    "else",
    "elseif",
    "for",
    "while",
    "do",
    "return",
    "break",
    "nil",
    "true",
    "false",
    "require"
  ]
}

/**
 * Mapa de "scope:" (language id do VS Code) para a família de tokenizer.
 * Cobre os valores sugeridos em SCOPE_VALUES. vue/svelte/html/json ficam de
 * fora de propósito: são linguagens hospedeiras/híbridas onde um tokenizer
 * de uma família só (C-like ou hash) erraria mais do que ajudaria — nesses
 * casos o corpo fica só com o highlight genérico embutido (TSX) e os
 * placeholders.
 *
 * "tsrx" (https://tsrx.dev/) é um superset de TypeScript para componentes de
 * UI — sintaticamente próximo o bastante de TS/JSX (mesmos comentários "//",
 * mesmas palavras-chave como function/const/if/for) para reaproveitar a
 * família C-like sem introduzir uma lista de keywords própria.
 */
export const SCOPE_FAMILY: Record<string, LanguageFamily> = {
  typescript: C_FAMILY,
  typescriptreact: C_FAMILY,
  javascript: C_FAMILY,
  javascriptreact: C_FAMILY,
  tsrx: C_FAMILY,
  java: C_FAMILY,
  c: C_FAMILY,
  cpp: C_FAMILY,
  csharp: C_FAMILY,
  go: C_FAMILY,
  rust: C_FAMILY,
  kotlin: C_FAMILY,
  swift: C_FAMILY,
  php: C_FAMILY,
  python: HASH_FAMILY,
  ruby: HASH_FAMILY,
  perl: HASH_FAMILY,
  lua: DASH_FAMILY
}

const NUMBER_RE = /\d+(\.\d+)?/y

// Mesmo padrão usado na gramática TextMate para $0, $1, ${1:label},
// ${TM_FILENAME_BASE/.../.../} (1 nível de aninhamento). Precisa ser
// verificado ANTES de número/keyword, senão o "1" de "${1:nome}" ou o "0"
// de "$0" seriam classificados como número de verdade do código.
const PLACEHOLDER_RE = /\$\{(?:[^{}]|\{[^{}]*\})*\}|\$[A-Z_][A-Z0-9_]*|\$\d+/y

// Cache do Set de keywords por família: SCOPE_FAMILY reaproveita a mesma
// instância de LanguageFamily entre várias linguagens (ex: C_FAMILY serve
// typescript, javascript, java, go, etc.), então um WeakMap por objeto de
// família evita recriar o Set a cada linha tokenizada — o que aconteceria
// centenas de vezes a cada atualização de semantic tokens, disparada a
// cada poucas teclas digitadas no arquivo.
const keywordSetCache = new WeakMap<LanguageFamily, Set<string>>()

function getKeywordSet(family: LanguageFamily): Set<string> {
  let set = keywordSetCache.get(family)
  if (!set) {
    set = new Set(family.keywords)
    keywordSetCache.set(family, set)
  }
  return set
}

/**
 * Tokeniza UMA linha de código de acordo com a família da linguagem.
 * Limitação assumida: não entende strings/comentários que atravessam
 * múltiplas linhas (ex: template literal de várias linhas, docstring
 * triple-quoted do Python) — cada linha é tratada isoladamente.
 */
export function tokenizeLine(line: string, family: LanguageFamily): Token[] {
  const tokens: Token[] = []
  const keywordSet = getKeywordSet(family)
  let i = 0

  while (i < line.length) {
    const rest = line.slice(i)

    // Comentário de linha: tudo até o fim da linha
    if (family.lineComment && rest.startsWith(family.lineComment)) {
      tokens.push({ start: i, length: line.length - i, type: "comment" })
      break
    }

    const ch = line[i]

    // Placeholder de snippet do VS Code ($0, ${1:label}, ...): pula sem
    // emitir token — quem colore isso é a gramática TextMate, não aqui.
    PLACEHOLDER_RE.lastIndex = i
    const placeholderMatch = PLACEHOLDER_RE.exec(line)
    if (placeholderMatch && placeholderMatch.index === i) {
      i += placeholderMatch[0].length
      continue
    }

    // String: consome até achar o delimitador de fechamento (ou fim da linha)
    if (ch !== undefined && family.stringDelimiters.includes(ch)) {
      const quote = ch
      let j = i + 1
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++ // pula caractere escapado
        j++
      }
      const end = Math.min(j + 1, line.length)
      tokens.push({ start: i, length: end - i, type: "string" })
      i = end
      continue
    }

    // Número
    NUMBER_RE.lastIndex = i
    const numberMatch = NUMBER_RE.exec(line)
    if (numberMatch && numberMatch.index === i) {
      tokens.push({ start: i, length: numberMatch[0].length, type: "number" })
      i += numberMatch[0].length
      continue
    }

    // Palavra (possível keyword)
    if (ch !== undefined && /[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j] ?? "")) j++
      const word = line.slice(i, j)
      if (keywordSet.has(word)) {
        tokens.push({ start: i, length: word.length, type: "keyword" })
      }
      i = j
      continue
    }

    i++
  }

  return tokens
}
