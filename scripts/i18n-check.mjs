import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
const ts = createRequire(import.meta.url)('typescript')

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const phrases = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/phrases.en.json'), 'utf8'))

function collapse(value) {
  return String(value).trim().replace(/\s+/g, ' ')
}
function lookup(value) {
  const collapsed = collapse(value)
  return phrases[collapsed] ?? phrases[collapsed.replace(/’/g, "'")] ?? phrases[collapsed.replace(/'/g, '’')]
}

const failures = []
for (const [key, value] of Object.entries(phrases)) {
  if (typeof value !== 'string' || !value.trim()) failures.push(`empty translation for ${JSON.stringify(key)}`)
}

const samples = [
  ['Annuler', 'Cancel'],
  ['Non autorisé', 'Access denied'],
  ['Chantier non trouvé', 'Project not found'],
  ['Bonjour', 'Hello'],
]
for (const [fr, en] of samples) {
  if (lookup(fr) !== en) failures.push(`expected ${JSON.stringify(fr)} -> ${JSON.stringify(en)}, got ${JSON.stringify(lookup(fr))}`)
}

const localeFile = fs.readFileSync(path.join(root, 'src/contexts/LocaleContext.tsx'), 'utf8')
const frKeys = [...localeFile.matchAll(/'((?:nav|dashboard|login|auth|language|setup)\.[^']+)'\s*:/g)].map((m) => m[1])
const uniqueFr = [...new Set(frKeys)]
const enSection = localeFile.split('en: {')[1] || ''
for (const key of uniqueFr) {
  if (!enSection.includes(`'${key}'`)) failures.push(`semantic key missing in English catalog: ${key}`)
}

const diacritic = /[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]/
const elision = /(?:^|[\s([«"“])(?:l|d|n|j|m|t|s|c|qu)['’][A-Za-zÀ-ÿ]/i
const lexicon = /(?<![\p{L}\p{N}])(?:chantier|chantiers|devis|ouvrier|ouvriers|sous-traitant|enregistrer|veuillez|aucun|aucune|facture|métré|magasinier|supprimer|ajouter|annuler|erreur|chargement|réception|tâche|quantité|montant)(?![\p{L}\p{N}])/iu
function isFrench(value) {
  return diacritic.test(value) || elision.test(value) || lexicon.test(value)
}

function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(ent.name)) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(full)
  }
}
const files = []
walk(path.join(root, 'src'), files)

const excluded = (rel) =>
  rel.startsWith('src/lib/i18n/')
  || rel === 'src/contexts/LocaleContext.tsx'
  || rel === 'src/app/public/portail/i18n.tsx'
  || rel === 'src/lib/checkin/rappel.ts'
  || rel.startsWith('templates/')

let missingCallSite = 0
let residualJsx = 0
let portalResidual = 0
let apiMissing = 0
const residualSamples = []
const apiSamples = []

for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  if (excluded(rel)) continue
  const text = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  function parentName(node) {
    let p = node.parent
    while (p) {
      if (ts.isJsxElement(p)) {
        const name = p.openingElement.tagName
        return ts.isIdentifier(name) ? name.text : ''
      }
      p = p.parent
    }
    return ''
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tx') {
      const arg = node.arguments[0]
      if (arg && ts.isStringLiteral(arg) && lookup(arg.text) === undefined) {
        missingCallSite++
        if (missingCallSite <= 20) failures.push(`${rel}: tx() missing catalog entry ${JSON.stringify(arg.text)}`)
      }
    }
    if (ts.isJsxText(node) && isFrench(node.getText()) && node.getText().trim().length > 2) {
      if (parentName(node) === 'UiText') {
        if (lookup(node.getText()) === undefined) {
          missingCallSite++
          if (missingCallSite <= 30) failures.push(`${rel}: UiText missing catalog entry ${JSON.stringify(collapse(node.getText()).slice(0, 120))}`)
        }
      } else if (rel.startsWith('src/app/public/portail/')) {
        portalResidual++
      } else {
        residualJsx++
        if (residualSamples.length < 25) residualSamples.push(`${rel}: ${collapse(node.getText()).slice(0, 100)}`)
      }
    }
    if (rel.startsWith('src/app/api/') && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && ts.isPropertyAssignment(node.parent) && node.parent.initializer === node) {
      const name = node.parent.name
      const prop = ts.isIdentifier(name) ? name.text : ''
      if (prop === 'error' && isFrench(node.text) && lookup(node.text) === undefined) {
        apiMissing++
        if (apiSamples.length < 15) apiSamples.push(collapse(node.text).slice(0, 120))
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

const report = {
  phrases: Object.keys(phrases).length,
  semanticKeys: uniqueFr.length,
  missingCallSite,
  residualFrenchJsxOutsidePortal: residualJsx,
  portalFrenchJsx: portalResidual,
  apiErrorsMissingFromCatalog: apiMissing,
  apiSamples,
  residualSamples,
  failures: failures.length,
}
fs.writeFileSync('/tmp/i18n-audit/check-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (failures.length) {
  console.error(failures.slice(0, 40).join('\n'))
  process.exit(1)
}
