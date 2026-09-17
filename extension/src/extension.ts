import * as vscode from "vscode";
import { SCOPE_FAMILY, tokenizeLine } from "./bodyTokenizer.js";

const DIRECTIVES = ["Header", "Snippet", "Body"] as const;

const HEADER_PROPERTIES: Record<string, string> = {
  scope:
    "Escopo de linguagem do VS Code onde o snippet fica disponível (ex: `typescript`, `typescriptreact`).",
  output:
    "Caminho do arquivo `.json` de snippets gerado pelo compilador, relativo ao arquivo `.vk`.",
};

const SNIPPET_PROPERTIES: Record<string, string> = {
  prefix: "Atalho digitado no editor para disparar o snippet.",
  name: "Nome do snippet — vira a chave no JSON de snippets do VS Code.",
  detail: "Descrição exibida na lista de sugestões (mapeia para `description` no schema).",
  template:
    "`true` | `false` — quando `true`, o snippet vira um template de arquivo (`isFileTemplate`).",
};

// Lista curada dos language ids mais comuns do VS Code para autocomplete de "scope:".
// Não é exaustiva de propósito — "scope" aceita qualquer language id válido,
// registrado pelo VS Code ou por outra extensão instalada.
const SCOPE_VALUES = [
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "tsrx",
  "vue",
  "svelte",
  "html",
  "json",
  "python",
  "kotlin",
  "swift",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "perl",
  "lua",
] as const;

const TEMPLATE_VALUES = ["true", "false"] as const;

type BlockKind = "none" | "header" | "snippet" | "body";

function findEnclosingBlock(document: vscode.TextDocument, fromLine: number): BlockKind {
  for (let i = fromLine; i >= 0; i--) {
    const text = document.lineAt(i).text.trim();
    if (text === "@Body") return "body";
    if (text === "@Snippet") return "snippet";
    if (text === "@Header") return "header";
  }
  return "none";
}

function directiveCompletionItem(name: (typeof DIRECTIVES)[number]): vscode.CompletionItem {
  const item = new vscode.CompletionItem(`@${name}`, vscode.CompletionItemKind.Keyword);
  item.insertText = name;
  item.detail = `Diretiva @${name}`;
  item.sortText = `0-${name}`;
  return item;
}

/** Verifica se o arquivo já tem um @Header — só pode existir um por arquivo. */
function hasHeaderDirective(document: vscode.TextDocument): boolean {
  for (let i = 0; i < document.lineCount; i++) {
    if (document.lineAt(i).text.trim() === "@Header") return true;
  }
  return false;
}

/**
 * Diretivas válidas no ponto atual do arquivo:
 * - @Header só aparece se o arquivo ainda não tiver um.
 * - @Snippet sempre pode ser sugerido (um arquivo tem vários).
 * - @Body só aparece dentro de um @Snippet que ainda não tem corpo.
 * - Dentro do corpo de um snippet (código arbitrário, ex: decorators do TS),
 *   não sugerimos diretiva nenhuma.
 */
function availableDirectiveCompletions(
  document: vscode.TextDocument,
  block: BlockKind,
): vscode.CompletionItem[] {
  if (block === "body") return [];

  const items: vscode.CompletionItem[] = [];
  if (!hasHeaderDirective(document)) items.push(directiveCompletionItem("Header"));
  items.push(directiveCompletionItem("Snippet"));
  if (block === "snippet") items.push(directiveCompletionItem("Body"));
  return items;
}

function propertyCompletionItems(properties: Record<string, string>): vscode.CompletionItem[] {
  return Object.entries(properties).map(([key, doc]) => {
    const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
    item.documentation = new vscode.MarkdownString(doc);
    // Sem ":" no insertText de propósito: assim o usuário digita ":" na
    // sequência, o que dispara nosso próprio provider (registrado com
    // ":" como trigger character) para sugerir o valor certo.
    return item;
  });
}

function enumValueCompletionItems(values: readonly string[]): vscode.CompletionItem[] {
  return values.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
}

/** Lê o valor de "scope:" declarado no (único) @Header do arquivo. */
function findHeaderScope(document: vscode.TextDocument): string | undefined {
  let insideHeader = false;
  for (let i = 0; i < document.lineCount; i++) {
    const trimmed = document.lineAt(i).text.trim();
    if (trimmed === "@Header") {
      insideHeader = true;
      continue;
    }
    if (trimmed === "@Snippet") break;
    if (insideHeader) {
      const match = /^scope\s*:\s*(.+)$/.exec(trimmed);
      if (match) return match[1]?.trim();
    }
  }
  return undefined;
}

/** Encontra os intervalos de linha [inicio, fim] de cada bloco @Body do arquivo. */
function findBodyRanges(document: vscode.TextDocument): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let bodyStart: number | null = null;

  for (let i = 0; i < document.lineCount; i++) {
    const trimmed = document.lineAt(i).text.trim();
    if (trimmed === "@Body") {
      bodyStart = i + 1;
      continue;
    }
    if ((trimmed === "@Snippet" || trimmed === "@Header") && bodyStart !== null) {
      ranges.push([bodyStart, i - 1]);
      bodyStart = null;
    }
  }
  if (bodyStart !== null) {
    ranges.push([bodyStart, document.lineCount - 1]);
  }
  return ranges;
}

const SEMANTIC_TOKEN_TYPES = ["comment", "string", "number", "keyword"] as const;
const semanticTokensLegend = new vscode.SemanticTokensLegend([...SEMANTIC_TOKEN_TYPES]);

/**
 * Colore comentário/string/número/keyword dentro de @Body de acordo com a
 * linguagem REAL declarada em "scope:" — é a parte que a gramática TextMate
 * (source.viken) não consegue fazer sozinha, porque ela não tem como "lembrar"
 * um valor lido em um bloco anterior. Cobre as famílias em SCOPE_FAMILY;
 * para scopes fora dela (vue/svelte/html/json/etc.) não emitimos tokens e o
 * corpo fica só com o highlight genérico embutido (TSX) + placeholders.
 */
const semanticTokensProvider: vscode.DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens(document) {
    const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);

    const scope = findHeaderScope(document);
    const family = scope ? SCOPE_FAMILY[scope] : undefined;

    if (family) {
      for (const [start, end] of findBodyRanges(document)) {
        for (let line = start; line <= end && line < document.lineCount; line++) {
          const text = document.lineAt(line).text;
          for (const token of tokenizeLine(text, family)) {
            builder.push(line, token.start, token.length, SEMANTIC_TOKEN_TYPES.indexOf(token.type));
          }
        }
      }
    }

    return builder.build();
  },
};

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = { language: "viken" };

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    selector,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.slice(0, position.character);
        const trimmedBefore = beforeCursor.trim();

        // 1) Digitou "@": sugere só as diretivas válidas nesse ponto do arquivo
        if (trimmedBefore === "@") {
          const block = findEnclosingBlock(document, position.line - 1);
          return availableDirectiveCompletions(document, block);
        }

        // 2) Valores conhecidos logo depois de "chave:"
        if (/^\s*scope\s*:\s*\S*$/.test(beforeCursor)) {
          return enumValueCompletionItems(SCOPE_VALUES);
        }
        if (/^\s*template\s*:\s*\S*$/.test(beforeCursor)) {
          return enumValueCompletionItems(TEMPLATE_VALUES);
        }

        // Já tem ":" na linha mas não é um valor que conhecemos
        // (ex: prefix/name/detail/output aceitam texto livre) — não interfere.
        if (beforeCursor.includes(":")) {
          return undefined;
        }

        // 3) Início de linha vazia dentro de um bloco: sugere propriedades
        if (trimmedBefore === "") {
          const block = findEnclosingBlock(document, position.line - 1);
          if (block === "header") return propertyCompletionItems(HEADER_PROPERTIES);
          if (block === "snippet") return propertyCompletionItems(SNIPPET_PROPERTIES);
        }

        return undefined;
      },
    },
    "@",
    ":",
  );

  const hoverProvider = vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[@A-Za-z_][A-Za-z0-9_]*/);
      if (!range) return undefined;

      const word = document.getText(range);

      if (word.startsWith("@")) {
        const name = word.slice(1);
        if ((DIRECTIVES as readonly string[]).includes(name)) {
          return new vscode.Hover(new vscode.MarkdownString(`**@${name}** — diretiva Viken.`));
        }
        return undefined;
      }

      const block = findEnclosingBlock(document, position.line);
      const doc =
        block === "header"
          ? HEADER_PROPERTIES[word]
          : block === "snippet"
            ? SNIPPET_PROPERTIES[word]
            : undefined;

      return doc ? new vscode.Hover(new vscode.MarkdownString(doc)) : undefined;
    },
  });

  context.subscriptions.push(completionProvider, hoverProvider);

  const semanticProvider = vscode.languages.registerDocumentSemanticTokensProvider(
    selector,
    semanticTokensProvider,
    semanticTokensLegend,
  );
  context.subscriptions.push(semanticProvider);
}

export function deactivate(): void {}
