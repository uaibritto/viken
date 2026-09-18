// src/cli/index.ts

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path"

import { Command } from "commander"

import { compileToVSCodeSnippets } from "../core/compiler.js"
import { parseViken } from "../core/parser.js"

const SUPPORTED_EXTENSIONS = new Set([".vk", ".viken"])
const IGNORED_DIR_NAMES = new Set(["node_modules", ".git"])

function hasSupportedExtension(path: string): boolean {
    return SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase())
}

/**
 * Percorre o diretório recursivamente coletando todos os arquivos .vk/.viken.
 * Diretórios ocultos (começando com ".") e "node_modules" são ignorados,
 * para evitar varrer dependências instaladas ou metadados de VCS.
 */
async function listVikenFilesRecursive(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const results: string[] = []

    for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
            if (IGNORED_DIR_NAMES.has(entry.name) || entry.name.startsWith(".")) {
                continue
            }
            results.push(...(await listVikenFilesRecursive(fullPath)))
            continue
        }

        if (entry.isFile() && hasSupportedExtension(entry.name)) {
            results.push(fullPath)
        }
    }

    return results
}

async function collectTargets(input: string): Promise<string[]> {
    const fullPath = resolve(process.cwd(), input)
    const stats = await stat(fullPath)

    if (stats.isDirectory()) {
        return listVikenFilesRecursive(fullPath)
    }

    if (stats.isFile()) {
        if (!hasSupportedExtension(fullPath)) {
            throw new Error(`Extensão não suportada: ${extname(fullPath)}. Use .vk ou .viken.`)
        }
        return [fullPath]
    }

    throw new Error(`Caminho não é arquivo nem diretório: ${fullPath}`)
}

async function ensureDirExists(path: string): Promise<void> {
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })
}

/**
 * Resolve o `output` do @Header contra a raiz do projeto (process.cwd(),
 * ou seja, o diretório onde o comando `viken compile` foi executado),
 * e NÃO contra o diretório onde o arquivo .vk/.viken está localizado.
 *
 * Também valida que o caminho resultante não escapa da raiz do projeto
 * (proteção contra path traversal via `output: ../../../etc/cron.d/x`
 * em um arquivo .vk malicioso ou de terceiros).
 */
function resolveOutputPath(projectRoot: string, output: string): string {
    const outPath = resolve(projectRoot, output)
    const rel = relative(projectRoot, outPath)

    if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(
            `'output' ("${output}") resolve para fora da raiz do projeto (${projectRoot})`
        )
    }

    return outPath
}

async function compileInput(input: string): Promise<void> {
    const files = await collectTargets(input)

    if (files.length === 0) {
        console.error(
            `Nenhum arquivo .vk ou .viken encontrado em: ${resolve(process.cwd(), input)}`
        )
        process.exitCode = 1
        return
    }

    const projectRoot = process.cwd()
    const writtenBy = new Map<string, string>() // outPath -> arquivo de origem
    let hadError = false

    for (const file of files) {
        const displayFile = relative(projectRoot, file)

        try {
            const content = await readFile(file, "utf8")
            const ast = parseViken(content)
            const json = compileToVSCodeSnippets(ast)
            const outPath = resolveOutputPath(projectRoot, ast.header.output)

            const previousSource = writtenBy.get(outPath)
            if (previousSource && previousSource !== file) {
                console.warn(
                    `⚠ ${displayFile}: 'output' (${relative(projectRoot, outPath)}) já foi escrito por ${relative(projectRoot, previousSource)} nesta mesma execução — o resultado anterior será sobrescrito.`
                )
            }
            writtenBy.set(outPath, file)

            await ensureDirExists(outPath)
            await writeFile(outPath, JSON.stringify(json, null, 2), "utf8")

            console.log(`✔ ${displayFile} -> ${relative(projectRoot, outPath)}`)
        } catch (err) {
            hadError = true
            const message = err instanceof Error ? err.message : String(err)
            console.error(`✘ ${displayFile}: ${message}`)
        }
    }

    if (hadError) {
        process.exitCode = 1
    }
}

const program = new Command()

program
    .name("viken")
    .description("Compilador da DSL Viken para snippets do VS Code")
    .version("0.1.4")

program
    .command("compile")
    .argument(
        "[path]",
        "Diretório (buscado recursivamente) com arquivos .vk/.viken, ou arquivo específico",
        "snippets"
    )
    .action(async (path) => {
        await compileInput(path)
    })

program.parseAsync(process.argv).catch((err) => {
    console.error(err)
    process.exit(1)
})
