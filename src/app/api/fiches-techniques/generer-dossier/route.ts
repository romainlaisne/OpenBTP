import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateFicheTechniqueCoverHTML, type FicheTechniqueCoverData } from '@/lib/pdf/templates/fiche-technique-template'
import { generateDossierTechniqueCoverHTML, type DossierTechniqueCoverData } from '@/lib/pdf/templates/dossier-technique-template'
import { readFile } from 'fs/promises'

// Configuration du timeout pour cette route (600 secondes = 10 minutes)
export const maxDuration = 600
export const dynamic = 'force-dynamic'

// Fonction pour vérifier si un chantier a un dossier personnalisé
function hasCustomFiches(chantierId: string): boolean {
  const customPath = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
  return fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()
}

// Fonction pour obtenir le chemin de base des fiches techniques (personnalisé ou standard)
function getFichesBaseDir(chantierId?: string): string {
  if (chantierId && hasCustomFiches(chantierId)) {
    return path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
  }
  return path.join(process.cwd(), 'public', 'fiches-techniques')
}

// Fonction récursive pour chercher un fichier PDF dans un dossier et ses sous-dossiers
function findPdfRecursive(dir: string, fileName: string): string | null {
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Chercher récursivement dans les sous-dossiers
        const found = findPdfRecursive(fullPath, fileName)
        if (found) return found
      } else if (item === fileName || item === `${fileName}.pdf` || (fileName.endsWith('.pdf') && item === fileName)) {
        // Fichier trouvé
        return fullPath
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche récursive dans ${dir}:`, error)
  }
  return null
}

// Fonction pour trouver un fichier PDF dans un dossier et ses sous-dossiers
async function findPdfFile(baseDir: string, fileName: string, chantierId?: string): Promise<string | null> {
  console.log(`🔍 [findPdfFile] Recherche: "${fileName}" dans ${baseDir}${chantierId ? ` (chantier: ${chantierId})` : ''}`)
  
  try {
    const isCustom = chantierId ? hasCustomFiches(chantierId) : false
    
    // PRIORITÉ 1: Si c'est un chemin complet relatif depuis public (ex: "chantiers/CH-XXX/fiches-techniques/...")
    // C'est le cas normal quand on utilise l'ID de la fiche depuis l'API structure
    if (fileName.startsWith('chantiers/') || fileName.startsWith('fiches-techniques/')) {
      const fullPath = path.join(process.cwd(), 'public', fileName)
      if (fs.existsSync(fullPath)) {
        // Vérifier que le fichier trouvé est dans le bon dossier
        if (isCustom && !fullPath.includes(`chantiers/${chantierId}/fiches-techniques`)) {
          console.warn(`⚠️ [findPdfFile] Fichier trouvé dans le mauvais dossier! ID: ${fileName}, Chemin: ${fullPath}`)
          return null // Ne pas retourner un fichier du mauvais dossier
        }
        if (!isCustom && fullPath.includes(`chantiers/${chantierId}`)) {
          console.warn(`⚠️ [findPdfFile] Fichier trouvé dans le dossier personnalisé alors qu'on utilise le standard!`)
          return null
        }
        console.log(`✅ [findPdfFile] Fichier trouvé via chemin complet: ${fullPath}`)
        return fullPath
      } else {
        console.log(`❌ [findPdfFile] Chemin complet n'existe pas: ${fullPath}`)
      }
    }
    
    // PRIORITÉ 2: Si on a un dossier personnalisé, NE JAMAIS chercher dans le dossier standard
    // Chercher uniquement dans le dossier personnalisé
    if (isCustom) {
      // Normaliser le nom de fichier
      const searchName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`
      
      // Chercher directement dans le dossier de base
      const directPath = path.join(baseDir, searchName)
      if (fs.existsSync(directPath)) {
        console.log(`✅ [findPdfFile] Fichier trouvé directement: ${directPath}`)
        return directPath
      }
      
      // Chercher récursivement dans le dossier personnalisé uniquement
      const foundPath = findPdfRecursive(baseDir, searchName)
      if (foundPath) {
        console.log(`✅ [findPdfFile] Fichier trouvé récursivement: ${foundPath}`)
        return foundPath
      }
      
      console.log(`❌ [findPdfFile] Fichier non trouvé dans le dossier personnalisé: ${baseDir}`)
      return null
    }
    
    // PRIORITÉ 3: Si on utilise le dossier standard, chercher normalement
    const searchName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`
    
    // Chercher directement dans le dossier de base
    const directPath = path.join(baseDir, searchName)
    if (fs.existsSync(directPath)) {
      console.log(`✅ [findPdfFile] Fichier trouvé directement: ${directPath}`)
      return directPath
    }
    
    // Chercher récursivement dans le dossier standard
    const foundPath = findPdfRecursive(baseDir, searchName)
    if (foundPath) {
      console.log(`✅ [findPdfFile] Fichier trouvé récursivement: ${foundPath}`)
      return foundPath
    }
    
    // Essayer les dossiers connus (pour compatibilité avec l'ancien système)
    const standardBaseDir = path.join(process.cwd(), 'public', 'fiches-techniques')
    if (baseDir === standardBaseDir) {
      const carrelagePath = path.join(standardBaseDir, 'Carrelage', searchName)
      if (fs.existsSync(carrelagePath)) {
        console.log(`✅ [findPdfFile] Fichier trouvé dans Carrelage: ${carrelagePath}`)
        return carrelagePath
      }
      
      const produitsTechniquePath = path.join(standardBaseDir, 'Produits Technique')
      const knownSubdirs = ['Colle', 'Etanchéité', 'Joint', 'Silicone']
      
      for (const subdir of knownSubdirs) {
        const ptPath = path.join(produitsTechniquePath, subdir, searchName)
        if (fs.existsSync(ptPath)) {
          console.log(`✅ [findPdfFile] Fichier trouvé dans ${subdir}: ${ptPath}`)
          return ptPath
        }
      }
    }
    
    console.log(`❌ [findPdfFile] Aucun fichier correspondant à "${fileName}" trouvé dans ${baseDir}`)
    return null
  } catch (error) {
    console.error(`❌ [findPdfFile] Erreur lors de la recherche:`, error)
    return null
  }
}

// Fonction pour normaliser les caractères spéciaux
function normalizeText(text: string): string {
  return text
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/[^\x00-\x7F]/g, '') // Supprime tous les caractères non-ASCII
    .trim();
}

export async function POST(request: Request) {
  await bindRequestLocale()
  const startTime = Date.now()
  console.log('🚀 [API] Début de la génération du dossier à', new Date().toISOString())
  
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, ficheIds, ficheReferences, options, dossierId, fichesStatuts, fichesSoustraitants, fichesRemarques } = await request.json()
    console.log('📥 [API] Données reçues:', {
      chantierId,
      nombreFiches: ficheIds?.length || 0,
      timestamp: Date.now() - startTime
    })
    console.log('  - Fiches techniques sélectionnées:', ficheIds)
    console.log('  - Références des fiches:', ficheReferences)
    console.log('  - Dossier ID (si régénération):', dossierId)
    console.log('  - Statuts des fiches:', fichesStatuts)
    console.log('  - Sous-traitants des fiches:', fichesSoustraitants)
    console.log('  - Remarques des fiches:', fichesRemarques)
    
    // Vérifier que les sous-traitants sont bien présents
    if (fichesSoustraitants && Object.keys(fichesSoustraitants).length > 0) {
      console.log('✅ [API] Sous-traitants reçus:', Object.keys(fichesSoustraitants).length, 'fiches avec sous-traitants')
    } else {
      console.warn('⚠️ [API] AUCUN sous-traitant reçu dans la requête!')
    }

    // Tableau pour stocker les erreurs éventuelles
    const errors: string[] = []

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: { 
        client: true 
      }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      return localizedJson({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return localizedJson({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Si dossierId est fourni, récupérer le dossier existant pour déterminer la version
    let dossierExistant = null
    let nouvelleVersion = 1
    if (dossierId) {
      dossierExistant = await prisma.dossierTechnique.findUnique({
        where: { id: dossierId },
        include: { fiches: true }
      })
      if (dossierExistant) {
        nouvelleVersion = dossierExistant.version + 1
      }
    }

    // Charger le logo en base64
    let logoBase64 = ''
    if (settings.logo) {
      try {
        const logoPath = path.join(process.cwd(), 'public', settings.logo)
        if (fs.existsSync(logoPath)) {
          const logoBuffer = await readFile(logoPath)
          logoBase64 = logoBuffer.toString('base64')
        }
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    // Créer un nouveau document PDF pour fusionner tous les PDFs
    const finalPdfDoc = await PDFDocument.create()

    // ===== 1. GÉNÉRER LA PAGE DE GARDE DU DOSSIER =====
    console.log('📄 [API] Génération de la page de garde du dossier...', { timestamp: Date.now() - startTime })
    const dateGeneration = new Date()
    const fichesValidees = fichesStatuts ? Object.values(fichesStatuts).filter((s: string) => s === 'VALIDEE').length : 0
    const fichesNouvelles = fichesStatuts ? Object.values(fichesStatuts).filter((s: string) => s === 'NOUVELLE_PROPOSITION').length : 0
    
    const dossierCoverData: DossierTechniqueCoverData = {
      settings: {
        name: settings.name,
        address: settings.address || '',
        zipCode: settings.zipCode || '',
        city: settings.city || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logo: settings.logo || undefined
      },
      chantier: {
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier || '',
        adresseChantier: chantier.adresseChantier,
        villeChantier: chantier.villeChantier,
        client: chantier.client ? { nom: chantier.client.nom } : undefined,
        dateDebut: chantier.dateDebut,
        maitreOuvrageNom: chantier.maitreOuvrageNom,
        maitreOuvrageAdresse: chantier.maitreOuvrageAdresse,
        maitreOuvrageLocalite: chantier.maitreOuvrageLocalite,
        bureauArchitectureNom: chantier.bureauArchitectureNom,
        bureauArchitectureAdresse: chantier.bureauArchitectureAdresse,
        bureauArchitectureLocalite: chantier.bureauArchitectureLocalite
      },
      dossier: {
        version: nouvelleVersion,
        dateGeneration: dateGeneration,
        datePremiereGeneration: dossierExistant ? dossierExistant.dateGeneration : null,
        nombreFiches: ficheIds.length,
        fichesValidees: fichesValidees,
        fichesNouvelles: fichesNouvelles
      },
      logoBase64: logoBase64 || undefined
    }

    const __locale = await bindRequestLocale()
    const dossierCoverHTML = localizeGeneratedHtml(__locale, generateDossierTechniqueCoverHTML(dossierCoverData), collectStrings(dossierCoverData))
    console.log('🖨️ [API] Génération PDF de la page de garde...', { timestamp: Date.now() - startTime })
    const dossierCoverPDF = await PDFGenerator.generatePDF(dossierCoverHTML, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })
    console.log('✅ [API] Page de garde générée', { timestamp: Date.now() - startTime })

    // Ajouter la page de garde au PDF final
    const dossierCoverPdfDoc = await PDFDocument.load(dossierCoverPDF)
    const dossierCoverPages = await finalPdfDoc.copyPages(dossierCoverPdfDoc, dossierCoverPdfDoc.getPageIndices())
    dossierCoverPages.forEach(page => finalPdfDoc.addPage(page))
    // Note: pdf-lib gère automatiquement la mémoire, pas besoin de destroy()

    // ===== 2. PRÉCHARGER LES DONNÉES POUR OPTIMISER LA TABLE DES MATIÈRES =====
    // OPTIMISATION : Précharger les chemins de fichiers et préparer les données en parallèle
    const baseDir = getFichesBaseDir(chantierId)
    console.log('🔍 [API] Préchargement des chemins de fichiers PDF en parallèle...', { timestamp: Date.now() - startTime })
    const fichePathsPreload = await Promise.all(
      ficheIds.map(ficheId => findPdfFile(baseDir, ficheId, chantierId))
    )
    
    // OPTIMISATION : Précharger tous les PDFs en parallèle pour la table des matières ET pour le reste
    // Stocker les bytes ET les infos pour éviter de recharger les fichiers
    const pagesInfoMap = new Map<string, { path: string; pageCount: number; name: string; bytes?: Buffer }>()
    const ficheBytesMap = new Map<string, Buffer>()
    console.log('📄 [API] Préchargement des PDFs en parallèle pour table des matières...', { timestamp: Date.now() - startTime })
    await Promise.all(
      fichePathsPreload.map(async (fichePath, index) => {
        if (fichePath) {
          try {
            const ficheBytes = await readFile(fichePath)
            const fichePdf = await PDFDocument.load(ficheBytes)
            const nbPages = fichePdf.getPageCount()
            
            const ficheName = path.basename(fichePath, '.pdf')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            // Stocker les bytes pour réutilisation ultérieure
            ficheBytesMap.set(ficheIds[index], ficheBytes)
            
            pagesInfoMap.set(ficheIds[index], {
              path: fichePath,
              pageCount: nbPages,
              name: ficheName,
              bytes: ficheBytes
            })
          } catch (error) {
            console.error(`Erreur lors de l'analyse de ${fichePath}:`, error)
            pagesInfoMap.set(ficheIds[index], {
              path: fichePath,
              pageCount: 1,
              name: path.basename(fichePath, '.pdf')
            })
          }
        }
      })
    )
    console.log('✅ [API] PDFs préchargés pour table des matières', { timestamp: Date.now() - startTime })

    // ===== 3. GÉNÉRER LA TABLE DES MATIÈRES (si demandé) =====
    if (options?.includeTableOfContents) {
      // Calculer les numéros de page en utilisant les données préchargées
      const pagesInfo: Array<{ id: string; path: string; startPage: number; pageCount: number; name: string }> = []
      let pageCount = 2 // Commencer à 2 (après la page de garde et la table des matières)
      
      for (const ficheId of ficheIds) {
        const info = pagesInfoMap.get(ficheId)
        if (info) {
          pagesInfo.push({
            id: ficheId,
            path: info.path,
            startPage: pageCount,
            pageCount: info.pageCount,
            name: info.name
          })
          
          // Mise à jour du compteur de pages (une page de couverture + les pages du PDF)
          pageCount += 1 + info.pageCount
        }
      }
      
      // Générer la table des matières en HTML
      const tocHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table des Matières</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #2d3748;
            background: white;
            width: 100%;
            min-height: 100vh;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 140px;
            max-height: 70px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 10px;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 30px;
        }
        
        .document-title h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .toc-list {
            margin-top: 30px;
            flex: 1;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .toc-item-title {
            flex: 1;
            font-size: 12px;
            color: #374151;
            line-height: 1.6;
            word-wrap: break-word;
        }
        
        .toc-item-dots {
            flex: 0 0 auto;
            padding: 0 12px;
            font-size: 11px;
            color: #cbd5e1;
        }
        
        .toc-item-page {
            flex: 0 0 auto;
            font-size: 12px;
            font-weight: 600;
            color: #1e40af;
            min-width: 35px;
            text-align: right;
        }
        
        @media print {
            body { font-size: 10px; }
            .container { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : `
                    <div style="width: 140px; height: 70px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                        ${settings.name.substring(0, 3).toUpperCase()}
                    </div>
                `}
                <div class="company-info">
                    <div><strong>${settings.name}</strong></div>
                    <div>${settings.address}</div>
                    <div>${settings.zipCode} ${settings.city}</div>
                </div>
            </div>
            
            <div class="document-title">
                <h1>TABLE DES MATIÈRES</h1>
            </div>
        </div>
        
        <div class="toc-list">
            ${pagesInfo.map(info => {
              const displayName = ficheReferences && ficheReferences[info.id] 
                ? `${info.name} - Réf CSC: ${ficheReferences[info.id]}`
                : info.name
              return `
                <div class="toc-item">
                    <div class="toc-item-title">${normalizeText(displayName)}</div>
                    <div class="toc-item-dots">${'·'.repeat(25)}</div>
                    <div class="toc-item-page">${info.startPage}</div>
                </div>
              `
            }).join('')}
        </div>
        
        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center;">
            <p>© ${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}</p>
        </div>
    </div>
</body>
</html>
      `
      
      const tocPDF = await PDFGenerator.generatePDF(tocHTML, {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      })
      
      // Ajouter la table des matières au PDF final
      const tocPdfDoc = await PDFDocument.load(tocPDF)
      const tocPages = await finalPdfDoc.copyPages(tocPdfDoc, tocPdfDoc.getPageIndices())
      tocPages.forEach(page => finalPdfDoc.addPage(page))
      // Note: pdf-lib gère automatiquement la mémoire, pas besoin de destroy()
    }

    // ===== 4. OPTIMISATION : PRÉCHARGER TOUTES LES DONNÉES EN PARALLÈLE =====
    console.log('📚 [API] Début du traitement des fiches techniques...', { timestamp: Date.now() - startTime })
    const isCustom = hasCustomFiches(chantierId || '')
    console.log(`📁 [API] Génération du dossier - BaseDir: ${baseDir}, IsCustom: ${isCustom}, ChantierId: ${chantierId}`)
    console.log(`📋 [API] Fiches à traiter (${ficheIds.length}):`, ficheIds)
    
    // OPTIMISATION : Réutiliser les chemins de fichiers déjà trouvés
    const fichePaths = fichePathsPreload
    
    // OPTIMISATION 2: Précharger tous les sous-traitants nécessaires en une seule requête
    const soustraitantIds = new Set<string>()
    ficheIds.forEach(ficheId => {
      const soustraitantIdRaw = fichesSoustraitants && fichesSoustraitants[ficheId] ? fichesSoustraitants[ficheId] : null
      if (soustraitantIdRaw && soustraitantIdRaw.toString().trim() !== '') {
        soustraitantIds.add(soustraitantIdRaw.toString().trim())
      }
    })
    
    console.log(`👥 [API] Chargement de ${soustraitantIds.size} sous-traitants en parallèle...`, { timestamp: Date.now() - startTime })
    const soustraitantsMap = new Map<string, { id: string; nom: string; logo: string | null }>()
    const soustraitantLogosMap = new Map<string, string>()
    
    if (soustraitantIds.size > 0) {
      const soustraitants = await Promise.all(
        Array.from(soustraitantIds).map(id => 
          prisma.soustraitant.findUnique({ where: { id } })
        )
      )
      
      // Charger les logos en parallèle
      await Promise.all(
        soustraitants.map(async (soustraitant) => {
          if (soustraitant) {
            soustraitantsMap.set(soustraitant.id, soustraitant)
            if (soustraitant.logo) {
              try {
                const soustraitantLogoPath = soustraitant.logo.startsWith('/')
                  ? path.join(process.cwd(), 'public', soustraitant.logo)
                  : path.join(process.cwd(), 'public', soustraitant.logo)
                if (fs.existsSync(soustraitantLogoPath)) {
                  const soustraitantLogoBuffer = await readFile(soustraitantLogoPath)
                  soustraitantLogosMap.set(soustraitant.id, soustraitantLogoBuffer.toString('base64'))
                }
              } catch (error) {
                console.warn(`Impossible de charger le logo du sous-traitant ${soustraitant.id}:`, error)
              }
            }
          }
        })
      )
    }
    console.log('✅ [API] Données préchargées', { timestamp: Date.now() - startTime })
    
    // ===== 5. GÉNÉRER LES PAGES DE COUVERTURE EN PARALLÈLE =====
    console.log('🖨️ [API] Génération des pages de couverture en parallèle...', { timestamp: Date.now() - startTime })
    
    const ficheCoverPromises = ficheIds.map(async (ficheId, index) => {
      const fichePath = fichePaths[index]
      if (!fichePath) {
        return { ficheId, error: `Fichier non trouvé: ${ficheId}` }
      }
      
      try {
        // Récupérer les informations de la fiche
        const ficheName = path.basename(fichePath, '.pdf')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        const ficheReference = ficheReferences && ficheReferences[ficheId] ? ficheReferences[ficheId] : null
        const ficheStatut = fichesStatuts && fichesStatuts[ficheId] ? fichesStatuts[ficheId] : 'BROUILLON'
        const ficheVersion = 1
        const soustraitantIdRaw = fichesSoustraitants && fichesSoustraitants[ficheId] ? fichesSoustraitants[ficheId] : null
        const remarques = fichesRemarques && fichesRemarques[ficheId] ? fichesRemarques[ficheId] : null
        
        // Récupérer le sous-traitant depuis le cache
        const soustraitantId = soustraitantIdRaw && soustraitantIdRaw.toString().trim() !== '' 
          ? soustraitantIdRaw.toString().trim() 
          : null
        const soustraitant = soustraitantId ? soustraitantsMap.get(soustraitantId) : null
        const soustraitantLogoBase64 = soustraitantId ? soustraitantLogosMap.get(soustraitantId) || '' : ''
        
        // Générer la page de couverture
        const ficheCoverData: FicheTechniqueCoverData = {
          settings: {
            name: settings.name,
            address: settings.address || '',
            zipCode: settings.zipCode || '',
            city: settings.city || '',
            phone: settings.phone || '',
            email: settings.email || '',
            logo: settings.logo || undefined
          },
          chantier: {
            chantierId: chantier.chantierId,
            nomChantier: chantier.nomChantier || '',
            client: chantier.client ? { nom: chantier.client.nom } : undefined,
            maitreOuvrageNom: chantier.maitreOuvrageNom,
            maitreOuvrageAdresse: chantier.maitreOuvrageAdresse,
            maitreOuvrageLocalite: chantier.maitreOuvrageLocalite,
            bureauArchitectureNom: chantier.bureauArchitectureNom,
            bureauArchitectureAdresse: chantier.bureauArchitectureAdresse,
            bureauArchitectureLocalite: chantier.bureauArchitectureLocalite
          },
          fiche: {
            id: ficheId,
            name: ficheName,
            reference: ficheReference,
            statut: ficheStatut,
            version: ficheVersion
          },
          soustraitant: soustraitant ? {
            nom: soustraitant.nom,
            logo: soustraitant.logo || undefined
          } : null,
          remarques: remarques,
          logoBase64: logoBase64 || undefined,
          soustraitantLogoBase64: soustraitantLogoBase64 || undefined
        }
        
        const __locale = await bindRequestLocale()
        const ficheCoverHTML = localizeGeneratedHtml(__locale, generateFicheTechniqueCoverHTML(ficheCoverData), collectStrings(ficheCoverData))
        const ficheCoverPDF = await PDFGenerator.generatePDF(ficheCoverHTML, {
          format: 'A4',
          orientation: 'portrait',
          margins: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          }
        })
        
        return { 
          ficheId, 
          fichePath, 
          ficheCoverPDF, 
          ficheName,
          ficheReference,
          ficheStatut,
          soustraitantId,
          remarques
        }
      } catch (error) {
        console.error(`Erreur lors de la génération de la couverture pour ${ficheId}:`, error)
        return { ficheId, error: String(error) }
      }
    })
    
    const ficheCovers = await Promise.all(ficheCoverPromises)
    console.log('✅ [API] Toutes les pages de couverture générées', { timestamp: Date.now() - startTime })
    
    // ===== 6. OPTIMISATION : RÉUTILISER LES PDFS DÉJÀ CHARGÉS =====
    console.log('📄 [API] Préchargement des PDFs originaux en parallèle...', { timestamp: Date.now() - startTime })
    const fichePdfsMap = new Map<string, PDFDocument>()
    
    // Réutiliser les bytes déjà chargés pour la table des matières pour éviter de relire les fichiers
    await Promise.all(
      ficheCovers
        .filter(fc => !fc.error && fc.fichePath)
        .map(async (ficheCover) => {
          try {
            // Vérifier si les bytes ont déjà été chargés pour la table des matières
            const cachedBytes = ficheBytesMap.get(ficheCover.ficheId)
            let ficheBytes: Buffer
            
            if (cachedBytes) {
              // OPTIMISATION : Réutiliser les bytes déjà chargés
              ficheBytes = cachedBytes
            } else {
              // Charger normalement si pas encore chargé
              ficheBytes = await readFile(ficheCover.fichePath!)
            }
            
            const fichePdf = await PDFDocument.load(ficheBytes)
            fichePdfsMap.set(ficheCover.ficheId, fichePdf)
          } catch (error) {
            console.error(`Erreur lors du chargement du PDF ${ficheCover.ficheId}:`, error)
            errors.push(`Erreur lors du chargement du PDF ${ficheCover.ficheId}: ${error}`)
          }
        })
    )
    console.log('✅ [API] Tous les PDFs originaux préchargés (réutilisation des bytes)', { timestamp: Date.now() - startTime })
    
    // ===== 7. AJOUTER LES PAGES AU PDF FINAL (avec libération mémoire optimisée) =====
    console.log('📄 [API] Ajout des pages au PDF final...', { timestamp: Date.now() - startTime })
    
    for (let index = 0; index < ficheCovers.length; index++) {
      const ficheCover = ficheCovers[index]
      
      if (ficheCover.error) {
        errors.push(ficheCover.error)
        continue
      }
      
      if (!ficheCover.ficheCoverPDF || !ficheCover.fichePath) {
        errors.push(`Données manquantes pour la fiche ${ficheCover.ficheId}`)
        continue
      }
      
      try {
        // Ajouter la page de couverture au PDF final
        const ficheCoverPdfDoc = await PDFDocument.load(ficheCover.ficheCoverPDF)
        const ficheCoverPages = await finalPdfDoc.copyPages(ficheCoverPdfDoc, ficheCoverPdfDoc.getPageIndices())
        ficheCoverPages.forEach(page => finalPdfDoc.addPage(page))
        // Note: pdf-lib gère automatiquement la mémoire, pas besoin de destroy()

        // Ajouter les pages de la fiche technique originale (déjà chargée)
        const fichePdf = fichePdfsMap.get(ficheCover.ficheId)
        if (fichePdf) {
          const fichePages = await finalPdfDoc.copyPages(fichePdf, fichePdf.getPageIndices())
          fichePages.forEach(page => finalPdfDoc.addPage(page))
          // Supprimer de la map pour libérer la référence et aider le GC
          fichePdfsMap.delete(ficheCover.ficheId)
        } else {
          errors.push(`PDF original non trouvé pour la fiche ${ficheCover.ficheId}`)
        }
        
        // Log de progression pour les gros dossiers
        if ((index + 1) % 10 === 0) {
          console.log(`📄 [API] Progression: ${index + 1}/${ficheCovers.length} fiches traitées`, { timestamp: Date.now() - startTime })
        }
        
      } catch (pdfError) {
        console.error(`Erreur lors du traitement de la fiche ${ficheCover.ficheId}:`, pdfError)
        errors.push(`Erreur lors du traitement de la fiche ${ficheCover.ficheId}: ${pdfError}`)
      }
    }
    
    // Nettoyer la map pour libérer la mémoire
    fichePdfsMap.clear()
    console.log('✅ [API] Toutes les fiches ajoutées au PDF final', { timestamp: Date.now() - startTime })

    // Si des erreurs sont survenues, les retourner
    if (errors.length > 0) {
      return localizedJson({ 
        error: 'Erreurs lors de la génération du dossier',
        details: errors 
      }, { status: 400 })
    }

    // Sauvegarder le PDF final
    console.log('💾 [API] Sauvegarde du PDF final...', { timestamp: Date.now() - startTime })
    const pdfBytes = await finalPdfDoc.save()
    const pdfSizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(2)
    console.log(`✅ [API] PDF final sauvegardé (${pdfSizeMB} MB)`, { timestamp: Date.now() - startTime })
    // Note: pdf-lib gère automatiquement la mémoire, pas besoin de destroy()
    
    // Créer le dossier Documents du chantier s'il n'existe pas
    const chantierDir = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!fs.existsSync(chantierDir)) {
      fs.mkdirSync(chantierDir, { recursive: true })
    }
    
    // Sauvegarder le fichier
    const dateStr = new Date().toISOString().split('T')[0]
    const versionSuffix = dossierExistant ? `-v${nouvelleVersion}` : ''
    const fileName = `dossier-technique-${dateStr}${versionSuffix}.pdf`
    const filePath = path.join(chantierDir, fileName)
    await fs.promises.writeFile(filePath, pdfBytes)
    
    // Créer ou mettre à jour l'entrée dans la base de données
    let dossierTechnique
    if (dossierId && dossierExistant) {
      // Mise à jour du dossier existant
      dossierTechnique = await prisma.dossierTechnique.update({
        where: { id: dossierId },
        data: {
          version: nouvelleVersion,
          url: `/chantiers/${chantierId}/documents/${fileName}`,
          taille: pdfBytes.length,
          dateModification: new Date(),
          includeTableOfContents: options?.includeTableOfContents || false
        }
      })
      
      // Supprimer les anciennes fiches et créer les nouvelles
      await prisma.dossierFiche.deleteMany({
        where: { dossierId: dossierId }
      })
    } else {
      // Vérifier s'il existe un dossier brouillon pour ce chantier
      const dossierBrouillon = await prisma.dossierTechnique.findFirst({
        where: {
          chantierId: chantierId,
          statut: 'BROUILLON',
          url: '' // Un dossier brouillon n'a pas encore de PDF
        },
        orderBy: { dateGeneration: 'desc' }
      })

      if (dossierBrouillon) {
        // Utiliser le dossier brouillon existant et le mettre à jour
        dossierTechnique = await prisma.dossierTechnique.update({
          where: { id: dossierBrouillon.id },
          data: {
            nom: `Dossier technique - ${dateStr}`,
            version: 1,
            statut: 'BROUILLON',
            url: `/chantiers/${chantierId}/documents/${fileName}`,
            taille: pdfBytes.length,
            dateGeneration: new Date(),
            dateModification: new Date(),
            includeTableOfContents: options?.includeTableOfContents || false
          }
        })
        
        // Supprimer les anciennes fiches du brouillon pour les remplacer par les nouvelles
        await prisma.dossierFiche.deleteMany({
          where: { dossierId: dossierBrouillon.id }
      })
    } else {
      // Création d'un nouveau dossier
      dossierTechnique = await prisma.dossierTechnique.create({
        data: {
          chantierId: chantierId,
          nom: `Dossier technique - ${dateStr}`,
          version: 1,
          statut: 'BROUILLON',
          url: `/chantiers/${chantierId}/documents/${fileName}`,
          taille: pdfBytes.length,
          dateGeneration: new Date(),
          dateModification: new Date(),
          createdBy: user.id,
          includeTableOfContents: options?.includeTableOfContents || false
        }
      })
      }
    }

    // OPTIMISATION : Créer toutes les entrées DossierFiche en parallèle avec createMany
    console.log('💾 [API] Création des entrées DossierFiche...', { timestamp: Date.now() - startTime })
    const dossierFichesData = ficheIds.map((ficheId, index) => {
      const ficheReference = ficheReferences && ficheReferences[ficheId] ? ficheReferences[ficheId] : null
      const ficheStatut = fichesStatuts && fichesStatuts[ficheId] ? fichesStatuts[ficheId] : 'BROUILLON'
      const soustraitantIdRaw = fichesSoustraitants && fichesSoustraitants[ficheId] ? fichesSoustraitants[ficheId] : null
      const soustraitantId = soustraitantIdRaw && soustraitantIdRaw.toString().trim() !== ''
        ? soustraitantIdRaw.toString().trim()
        : null
      const remarques = fichesRemarques && fichesRemarques[ficheId] ? fichesRemarques[ficheId] : null

      return {
        dossierId: dossierTechnique.id,
        ficheId: ficheId,
        ficheReference: ficheReference,
        version: 1,
        statut: ficheStatut,
        ordre: index + 1,
        soustraitantId: soustraitantId,
        remarques: remarques
      }
    })

    // Utiliser createMany pour créer toutes les entrées en une seule requête
    await prisma.dossierFiche.createMany({
      data: dossierFichesData
    })
    console.log('✅ [API] Toutes les entrées DossierFiche créées', { timestamp: Date.now() - startTime })

    // Créer aussi une entrée Document pour la compatibilité
    await prisma.document.create({
      data: {
        nom: `Dossier technique - ${dateStr}${versionSuffix ? ` ${versionSuffix}` : ''} - ${ficheIds.length} fiches`,
        type: 'DOSSIER_TECHNIQUE',
        url: `/chantiers/${chantierId}/documents/${fileName}`,
        taille: pdfBytes.length,
        mimeType: 'application/pdf',
        updatedAt: new Date(),
        chantierId: chantierId,
        createdBy: user.id,
        metadata: {
          dossierTechniqueId: dossierTechnique.id
        }
      }
    })

    // Retourner le PDF
    const totalDuration = Date.now() - startTime
    console.log(`🎉 [API] Génération terminée avec succès en ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    // Convertir en Uint8Array standard pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBytes)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`
      }
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`❌ [API] Erreur après ${totalDuration}ms:`, error)
    return localizedJson(
      { error: 'Erreur lors de la génération du dossier', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
