// src/core/parser.ts

import type { FileNode, HeaderNode, SnippetNode } from "./ast.js"

type ParserState = "none" | "header" | "snippet-props" | "snippet-body"

function countIndent(line: string): number {
    let count = 0
    for (const ch of line) {
        if (ch === " ") {
            count++
        } else if (ch === "\t") {
            count += 4 // convenção simples: 1 tab = 4 colunas
        } else {
            break
        }
    }
    return count
}

/**
 * Comentários no Viken só existem como LINHA INTEIRA começando com "#",
 * e só são reconhecidos em @Header/@Snippet (propriedades). Dentro de
 * @Body o conteúdo é código arbitrário do usuário e nunca é tocado —
 * caso contrário, um "#" dentro de uma cor CSS, uma URL com âncora
 * (http://x#y) ou um comentário de shell dentro do próprio snippet
 * seria corrompido silenciosamente.
 */
function isCommentLine(trimmed: string): boolean {
    return trimmed.startsWith("#")
}

/**
 * Remove linhas em branco do início/fim do corpo (sobra de formatação),
 * mas PRESERVA linhas em branco internas, que fazem parte da formatação
 * intencional do snippet. Depois, remove a indentação mínima comum.
 */
function normalizeBody(bodyLines: string[]): string[] {
    let start = 0
    let end = bodyLines.length

    while (start < end && (bodyLines[start] ?? "").trim() === "") start++
    while (end > start && (bodyLines[end - 1] ?? "").trim() === "") end--

    const trimmedEdges = bodyLines.slice(start, end)
    const nonEmpty = trimmedEdges.filter((l) => l.trim().length > 0)
    if (nonEmpty.length === 0) return []

    const minIndent = Math.min(...nonEmpty.map(countIndent))
    return trimmedEdges.map((line) => (line.trim().length === 0 ? "" : line.slice(minIndent)))
}

/**
 * Se o valor estiver entre aspas duplas ("..."), remove as aspas e
 * desfaz o escape de aspas internas (\"). Isso permite escrever
 * `name: "React Functional Component"` — útil sobretudo quando o valor
 * contém palavras que um syntax highlighter poderia confundir com
 * palavras-chave de código (ex: "function", "class", "return").
 * Valores sem aspas continuam funcionando normalmente (retrocompatível).
 */
function unquoteValue(value: string): string {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1).replace(/\\"/g, '"')
    }
    return value
}

/** Faz o split de "chave: valor", preservando ":" extras dentro do valor. */
function splitKeyValue(
    trimmed: string,
    original: string,
    lineNumber: number,
    context: string
): [string, string] {
    const idx = trimmed.indexOf(":")
    if (idx === -1) {
        throw new Error(`Sintaxe inválida em ${context} na linha ${lineNumber}: "${original}"`)
    }

    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()

    if (!key) {
        throw new Error(`Sintaxe inválida em ${context} na linha ${lineNumber}: "${original}"`)
    }

    return [key, unquoteValue(value)]
}

export function parseViken(source: string): FileNode {
    const lines = source.split(/\r?\n/)

    let header: HeaderNode | null = null
    const snippets: SnippetNode[] = []
    const seenNames = new Set<string>()

    let currentSnippet: SnippetNode | null = null
    let state: ParserState = "none"

    const closeCurrentSnippet = (): void => {
        if (currentSnippet) {
            currentSnippet.body = normalizeBody(currentSnippet.body)
            snippets.push(currentSnippet)
            currentSnippet = null
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const original = lines[i]
        if (original === undefined) continue

        const lineNumber = i + 1
        const trimmed = original.trim()

        // --- Corpo do snippet: tudo é literal, inclusive linhas em branco e "#" ---
        if (state === "snippet-body") {
            const isNewDirective = trimmed === "@Header" || trimmed === "@Snippet"
            if (!isNewDirective) {
                currentSnippet!.body.push(original)
                continue
            }
            // uma nova diretiva encerra o corpo atual; cai para o tratamento normal abaixo
        }

        if (trimmed === "") {
            continue
        }

        if (isCommentLine(trimmed)) {
            continue
        }

        if (trimmed === "@Header") {
            if (header !== null) {
                throw new Error(`Header duplicado na linha ${lineNumber}`)
            }
            closeCurrentSnippet()
            state = "header"
            continue
        }

        if (trimmed === "@Snippet") {
            closeCurrentSnippet()
            currentSnippet = { type: "Snippet", name: "", prefix: "", body: [] }
            state = "snippet-props"
            continue
        }

        if (trimmed === "@Body") {
            if (!currentSnippet || state !== "snippet-props") {
                throw new Error(`"@Body" fora de um @Snippet na linha ${lineNumber}`)
            }
            state = "snippet-body"
            continue
        }

        if (state === "header") {
            const [key, value] = splitKeyValue(trimmed, original, lineNumber, "Header")

            if (!header) {
                header = { type: "Header", scope: "", output: "" }
            }

            if (key === "scope") {
                header.scope = value
            } else if (key === "output") {
                header.output = value
            }
            // demais chaves são ignoradas por enquanto
            continue
        }

        if (state === "snippet-props" && currentSnippet) {
            const [key, rawValue] = splitKeyValue(trimmed, original, lineNumber, "Snippet")

            if (key === "name") {
                currentSnippet.name = rawValue
            } else if (key === "prefix") {
                currentSnippet.prefix = rawValue
            } else if (key === "detail") {
                currentSnippet.detail = rawValue
            } else if (key === "template") {
                const normalized = rawValue.toLowerCase()
                if (normalized !== "true" && normalized !== "false") {
                    throw new Error(
                        `Valor inválido para 'template' na linha ${lineNumber}: "${rawValue}" (use true ou false)`
                    )
                }
                currentSnippet.template = normalized === "true"
            }
            // props extras podem ser suportadas depois
            continue
        }

        throw new Error(
            `Linha fora de @Header/@Snippet/@Body na linha ${lineNumber}: "${original}"`
        )
    }

    closeCurrentSnippet()

    if (!header) {
        throw new Error("Arquivo sem @Header")
    }
    if (!header.scope) {
        throw new Error("Header sem 'scope'")
    }
    if (!header.output) {
        throw new Error("Header sem 'output'")
    }

    for (const snip of snippets) {
        if (!snip.name) {
            throw new Error("Snippet sem 'name'")
        }
        if (!snip.prefix) {
            throw new Error(`Snippet "${snip.name}" sem 'prefix'`)
        }
        if (seenNames.has(snip.name)) {
            throw new Error(`Nome de snippet duplicado: "${snip.name}"`)
        }
        seenNames.add(snip.name)
    }

    return {
        type: "File",
        header,
        snippets
    }
}
