import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { basename, dirname, extname, join, resolve } from "node:path"

import { Command } from "commander"

import { compileToVSCodeSnippets } from "../core/compiler.js"
import { parseViken } from "../core/parser.js"

const SUPPORTED_EXTENSIONS = new Set([".vk", ".viken"])

async function listVikenFilesInDir(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
        .filter((e) => e.isFile())
        .map((e) => join(dir, e.name))
        .filter((p) => SUPPORTED_EXTENSIONS.has(extname(p)))
}

async function collectTargets(input: string): Promise<string[]> {
    const fullPath = resolve(process.cwd(), input)
    const stats = await stat(fullPath)

    if (stats.isDirectory()) {
        return listVikenFilesInDir(fullPath)
    }

    if (stats.isFile()) {
        const ext = extname(fullPath)
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
            throw new Error(`Extensão não suportada: ${ext}. Use .vk ou .viken.`)
        }
        return [fullPath]
    }

    throw new Error(`Caminho não é arquivo nem diretório: ${fullPath}`)
}

async function ensureDirExists(path: string): Promise<void> {
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })
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

    for (const file of files) {
        const content = await readFile(file, "utf8")
        const ast = parseViken(content)
        const json = compileToVSCodeSnippets(ast)
        const outPath = resolve(dirname(file), ast.header.output)

        await ensureDirExists(outPath)
        await writeFile(outPath, JSON.stringify(json, null, 2), "utf8")

        console.log(`✔ ${basename(file)} -> ${outPath}`)
    }
}

const program = new Command()

program
    .name("viken")
    .description("Compilador da DSL Viken para snippets do VS Code")
    .version("0.1.0")

program
    .command("compile")
    .argument("[path]", "Diretório com arquivos .vk/.viken ou arquivo específico", "snippets")
    .action(async (path) => {
        await compileInput(path)
    })

program.parseAsync(process.argv).catch((err) => {
    console.error(err)
    process.exit(1)
})
