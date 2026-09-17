import type { FileNode } from "./ast.js"

export interface VSCodeSnippet {
    prefix: string
    description?: string // agora é opcional
    body: string[]
    scope?: string
    isFileTemplate?: boolean
}

export type VSCodeSnippetsFile = Record<string, VSCodeSnippet>

export function compileToVSCodeSnippets(file: FileNode): VSCodeSnippetsFile {
    const result: VSCodeSnippetsFile = {}
    const scope = file.header.scope // cada snippet herda o scope do Header

    for (const snippet of file.snippets) {
        const name = snippet.name
        const body = snippet.body.length > 0 ? snippet.body : [""]
        const prefix = snippet.prefix

        const entry: VSCodeSnippet = {
            scope,
            prefix,
            body
        }

        // Só define description se detail tiver sido passado
        if (snippet.detail !== undefined) {
            entry.description = snippet.detail
        }

        if (snippet.template === true) {
            entry.isFileTemplate = true
        }

        result[name] = entry
    }

    return result
}
