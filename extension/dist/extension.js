"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// src/bodyTokenizer.ts
var C_FAMILY = {
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
};
var HASH_FAMILY = {
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
};
var DASH_FAMILY = {
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
};
var SCOPE_FAMILY = {
  typescript: C_FAMILY,
  typescriptreact: C_FAMILY,
  javascript: C_FAMILY,
  javascriptreact: C_FAMILY,
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
};
var NUMBER_RE = /\d+(\.\d+)?/y;
var PLACEHOLDER_RE = /\$\{(?:[^{}]|\{[^{}]*\})*\}|\$[A-Z_][A-Z0-9_]*|\$\d+/y;
function tokenizeLine(line, family) {
  const tokens = [];
  const keywordSet = new Set(family.keywords);
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    if (family.lineComment && rest.startsWith(family.lineComment)) {
      tokens.push({ start: i, length: line.length - i, type: "comment" });
      break;
    }
    const ch = line[i];
    PLACEHOLDER_RE.lastIndex = i;
    const placeholderMatch = PLACEHOLDER_RE.exec(line);
    if (placeholderMatch && placeholderMatch.index === i) {
      i += placeholderMatch[0].length;
      continue;
    }
    if (ch !== void 0 && family.stringDelimiters.includes(ch)) {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      const end = Math.min(j + 1, line.length);
      tokens.push({ start: i, length: end - i, type: "string" });
      i = end;
      continue;
    }
    NUMBER_RE.lastIndex = i;
    const numberMatch = NUMBER_RE.exec(line);
    if (numberMatch && numberMatch.index === i) {
      tokens.push({ start: i, length: numberMatch[0].length, type: "number" });
      i += numberMatch[0].length;
      continue;
    }
    if (ch !== void 0 && /[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j] ?? "")) j++;
      const word = line.slice(i, j);
      if (keywordSet.has(word)) {
        tokens.push({ start: i, length: word.length, type: "keyword" });
      }
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

// src/extension.ts
var DIRECTIVES = ["Header", "Snippet", "Body"];
var HEADER_PROPERTIES = {
  scope: "Escopo de linguagem do VS Code onde o snippet fica dispon\xEDvel (ex: `typescript`, `typescriptreact`).",
  output: "Caminho do arquivo `.json` de snippets gerado pelo compilador, relativo ao arquivo `.vk`."
};
var SNIPPET_PROPERTIES = {
  prefix: "Atalho digitado no editor para disparar o snippet.",
  name: "Nome do snippet \u2014 vira a chave no JSON de snippets do VS Code.",
  detail: "Descri\xE7\xE3o exibida na lista de sugest\xF5es (mapeia para `description` no schema).",
  template: "`true` | `false` \u2014 quando `true`, o snippet vira um template de arquivo (`isFileTemplate`)."
};
var SCOPE_VALUES = [
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
  "lua"
];
var TEMPLATE_VALUES = ["true", "false"];
function findEnclosingBlock(document, fromLine) {
  for (let i = fromLine; i >= 0; i--) {
    const text = document.lineAt(i).text.trim();
    if (text === "@Body") return "body";
    if (text === "@Snippet") return "snippet";
    if (text === "@Header") return "header";
  }
  return "none";
}
function directiveCompletionItem(name) {
  const item = new vscode.CompletionItem(`@${name}`, vscode.CompletionItemKind.Keyword);
  item.insertText = name;
  item.detail = `Diretiva @${name}`;
  item.sortText = `0-${name}`;
  return item;
}
function hasHeaderDirective(document) {
  for (let i = 0; i < document.lineCount; i++) {
    if (document.lineAt(i).text.trim() === "@Header") return true;
  }
  return false;
}
function availableDirectiveCompletions(document, block) {
  if (block === "body") return [];
  const items = [];
  if (!hasHeaderDirective(document)) items.push(directiveCompletionItem("Header"));
  items.push(directiveCompletionItem("Snippet"));
  if (block === "snippet") items.push(directiveCompletionItem("Body"));
  return items;
}
function propertyCompletionItems(properties) {
  return Object.entries(properties).map(([key, doc]) => {
    const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
    item.documentation = new vscode.MarkdownString(doc);
    return item;
  });
}
function enumValueCompletionItems(values) {
  return values.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
}
function findHeaderScope(document) {
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
  return void 0;
}
function findBodyRanges(document) {
  const ranges = [];
  let bodyStart = null;
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
var SEMANTIC_TOKEN_TYPES = ["comment", "string", "number", "keyword"];
var semanticTokensLegend = new vscode.SemanticTokensLegend([...SEMANTIC_TOKEN_TYPES]);
var semanticTokensProvider = {
  provideDocumentSemanticTokens(document) {
    const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);
    const scope = findHeaderScope(document);
    const family = scope ? SCOPE_FAMILY[scope] : void 0;
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
  }
};
function activate(context) {
  const selector = { language: "viken" };
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    selector,
    {
      provideCompletionItems(document, position) {
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.slice(0, position.character);
        const trimmedBefore = beforeCursor.trim();
        if (trimmedBefore === "@") {
          const block = findEnclosingBlock(document, position.line - 1);
          return availableDirectiveCompletions(document, block);
        }
        if (/^\s*scope\s*:\s*\S*$/.test(beforeCursor)) {
          return enumValueCompletionItems(SCOPE_VALUES);
        }
        if (/^\s*template\s*:\s*\S*$/.test(beforeCursor)) {
          return enumValueCompletionItems(TEMPLATE_VALUES);
        }
        if (beforeCursor.includes(":")) {
          return void 0;
        }
        if (trimmedBefore === "") {
          const block = findEnclosingBlock(document, position.line - 1);
          if (block === "header") return propertyCompletionItems(HEADER_PROPERTIES);
          if (block === "snippet") return propertyCompletionItems(SNIPPET_PROPERTIES);
        }
        return void 0;
      }
    },
    "@",
    ":"
  );
  const hoverProvider = vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[@A-Za-z_][A-Za-z0-9_]*/);
      if (!range) return void 0;
      const word = document.getText(range);
      if (word.startsWith("@")) {
        const name = word.slice(1);
        if (DIRECTIVES.includes(name)) {
          return new vscode.Hover(new vscode.MarkdownString(`**@${name}** \u2014 diretiva Viken.`));
        }
        return void 0;
      }
      const block = findEnclosingBlock(document, position.line);
      const doc = block === "header" ? HEADER_PROPERTIES[word] : block === "snippet" ? SNIPPET_PROPERTIES[word] : void 0;
      return doc ? new vscode.Hover(new vscode.MarkdownString(doc)) : void 0;
    }
  });
  context.subscriptions.push(completionProvider, hoverProvider);
  const semanticProvider = vscode.languages.registerDocumentSemanticTokensProvider(
    selector,
    semanticTokensProvider,
    semanticTokensLegend
  );
  context.subscriptions.push(semanticProvider);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map