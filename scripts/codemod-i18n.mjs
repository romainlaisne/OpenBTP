import fs from 'fs'
import path from 'path'
import ts from '/tmp/i18n-audit/node_modules/typescript/lib/typescript.js'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const phrases = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/phrases.en.json'), 'utf8'))
const ATTRS = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'helperText', 'subtitle', 'description', 'emptyMessage', 'searchPlaceholder', 'allOptionLabel'])

function collapse(value) {
  return value.trim().replace(/\s+/g, ' ')
}
function inCatalog(value) {
  const collapsed = collapse(value)
  if (!collapsed) return false
  return phrases[collapsed] !== undefined || phrases[collapsed.replace(/’/g, "'")] !== undefined || phrases[collapsed.replace(/'/g, '’')] !== undefined
}
function catalogKey(value) {
  const collapsed = collapse(value)
  if (phrases[collapsed] !== undefined) return collapsed
  const straight = collapsed.replace(/’/g, "'")
  if (phrases[straight] !== undefined) return straight
  const curly = collapsed.replace(/'/g, '’')
  if (phrases[curly] !== undefined) return curly
  return collapsed
}

function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(ent.name)) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, acc)
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(full)
  }
}

function skipFile(rel) {
  return rel.startsWith('src/lib/i18n/')
    || rel === 'src/contexts/LocaleContext.tsx'
    || rel.startsWith('src/app/public/portail/')
    || rel === 'src/utils/format.ts'
}

function isComparison(node) {
  const parent = node.parent
  if (!parent || !ts.isBinaryExpression(parent)) return false
  const kind = parent.operatorToken.kind
  return kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    || kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
    || kind === ts.SyntaxKind.EqualsEqualsToken
    || kind === ts.SyntaxKind.ExclamationEqualsToken
    || kind === ts.SyntaxKind.CaseClause
}

function tagName(node) {
  const name = node.tagName
  if (ts.isIdentifier(name)) return name.text
  return null
}

const files = []
walk(path.join(root, 'src'), files)
let touched = 0
let replacements = 0

for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  if (skipFile(rel)) continue
  const original = fs.readFileSync(file, 'utf8')
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, kind)
  const edits = []
  let needsTx = false
  let needsUiText = false

  function visit(node) {
    if (ts.isJsxText(node) && inCatalog(node.getText()) && node.getText().trim()) {
      const parent = node.parent
      const parentName = parent && ts.isJsxElement(parent) ? tagName(parent.openingElement) : null
      if (parentName !== 'UiText') {
        const raw = node.getText()
        if (/[<{]/.test(raw)) {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `{tx(${JSON.stringify(catalogKey(raw))})}` })
          needsTx = true
        } else {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `<UiText>${raw}</UiText>` })
          needsUiText = true
        }
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ATTRS.has(node.name.getText()) && inCatalog(node.initializer.text) && !isComparison(node.initializer)) {
      const start = node.initializer.getStart(sf)
      const end = node.initializer.getEnd()
      edits.push({ start, end, text: `{tx(${JSON.stringify(catalogKey(node.initializer.text))})}` })
      needsTx = true
    }

    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression) && inCatalog(node.expression.text) && !isComparison(node.expression)) {
      const start = node.expression.getStart(sf)
      const end = node.expression.getEnd()
      edits.push({ start, end, text: `tx(${JSON.stringify(catalogKey(node.expression.text))})` })
      needsTx = true
    }

    if (ts.isCallExpression(node)) {
      const expr = node.expression
      const isToast = (ts.isIdentifier(expr) && expr.text === 'toast')
        || (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'toast')
      const isDialog = ts.isIdentifier(expr) && (expr.text === 'alert' || expr.text === 'confirm')
      if (isToast || isDialog) {
        for (const arg of node.arguments) {
          if (ts.isStringLiteral(arg) && inCatalog(arg.text) && !isComparison(arg)) {
            edits.push({ start: arg.getStart(sf), end: arg.getEnd(), text: `tx(${JSON.stringify(catalogKey(arg.text))})` })
            needsTx = true
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(sf)
  if (!edits.length) continue

  edits.sort((a, b) => b.start - a.start)
  let next = original
  const seen = new Set()
  for (const edit of edits) {
    const key = `${edit.start}:${edit.end}`
    if (seen.has(key)) continue
    seen.add(key)
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end)
    replacements++
  }

  if (needsUiText) next = addNamedImport(next, '@/contexts/LocaleContext', 'UiText')
  if (needsTx && !next.includes("from '@/lib/i18n/translate'") && !next.includes('from "@/lib/i18n/translate"')) {
    next = addImportLine(next, "import { tx } from '@/lib/i18n/translate'\n")
  }
  fs.writeFileSync(file, next)
  touched++
}

console.log(JSON.stringify({ touched, replacements }))

function addImportLine(source, line) {
  const useClient = source.match(/^(['"])use client\1;?\s*\n/)
  if (useClient) return source.slice(0, useClient[0].length) + line + source.slice(useClient[0].length)
  return line + source
}

function addNamedImport(source, specifier, name) {
  const regex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*(['"])${specifier.replace('/', '\\/')}\\2`)
  const match = source.match(regex)
  if (match) {
    if (match[1].split(',').some((part) => part.trim() === name)) return source
    const replaced = source.replace(regex, `import {${match[1].replace(/\s*$/, '')}, ${name} } from ${match[2]}${specifier}${match[2]}`)
    return replaced
  }
  return addImportLine(source, `import { ${name} } from '${specifier}'\n`)
}
