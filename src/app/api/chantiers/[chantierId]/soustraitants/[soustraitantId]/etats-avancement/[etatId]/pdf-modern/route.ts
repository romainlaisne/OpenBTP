import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateEtatAvancementHTML, EtatAvancementData } from '@/lib/pdf/templates/etat-avancement-template'
import { roundToTwoDecimals } from '@/utils/calculs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }
) {
  await bindRequestLocale()
  try {
    const resolvedParams = await props.params
    const chantierReadableId = resolvedParams.chantierId
    const soustraitantId = resolvedParams.soustraitantId
    const etatId = parseInt(resolvedParams.etatId)

    console.log(`🎯 Génération PDF moderne - État sous-traitant ID:${etatId} du chantier ${chantierReadableId}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Session non autorisée')
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le chantier avec le client
    const chantierEntity = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId },
      include: {
        client: true
      }
    })

    if (!chantierEntity) {
      console.error(`❌ Chantier non trouvé: ${chantierReadableId}`)
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer l'état d'avancement sous-traitant avec ses relations
    const etatAvancement = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatId,
        soustraitantId: soustraitantId
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
        soustraitant: true,
        etat_avancement: true
      }
    })

    if (!etatAvancement) {
      console.error(`❌ État d'avancement sous-traitant N°${etatId} non trouvé`)
      return localizedJson({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    console.log(`✅ État d'avancement trouvé: Situation N°${etatAvancement.numero} (ID:${etatId}) - ${etatAvancement.ligne_soustraitant_etat_avancement.length} lignes, ${etatAvancement.avenant_soustraitant_etat_avancement.length} avenants (estFinalise: ${etatAvancement.estFinalise})`)

    // Helper pour garantir des nombres valides (états non validés peuvent avoir null/undefined)
    const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)

    // Récupérer les paramètres de l'entreprise
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log('✅ Paramètres entreprise récupérés')

    // Calculer les totaux
    const totalCommandeInitialeRaw = etatAvancement.ligne_soustraitant_etat_avancement.reduce((acc, ligne) => ({
      precedent: acc.precedent + num(ligne.montantPrecedent),
      actuel: acc.actuel + num(ligne.montantActuel),
      total: acc.total + num(ligne.montantTotal)
    }), { precedent: 0, actuel: 0, total: 0 })

    const totalCommandeInitiale = {
      precedent: roundToTwoDecimals(totalCommandeInitialeRaw.precedent),
      actuel: roundToTwoDecimals(totalCommandeInitialeRaw.actuel),
      total: roundToTwoDecimals(totalCommandeInitialeRaw.total)
    }

    const totalAvenantsRaw = etatAvancement.avenant_soustraitant_etat_avancement.reduce((acc, avenant) => ({
      precedent: acc.precedent + num(avenant.montantPrecedent),
      actuel: acc.actuel + num(avenant.montantActuel),
      total: acc.total + num(avenant.montantTotal)
    }), { precedent: 0, actuel: 0, total: 0 })

    const totalAvenants = {
      precedent: roundToTwoDecimals(totalAvenantsRaw.precedent),
      actuel: roundToTwoDecimals(totalAvenantsRaw.actuel),
      total: roundToTwoDecimals(totalAvenantsRaw.total)
    }

    const totalGeneral = {
      precedent: roundToTwoDecimals(totalCommandeInitiale.precedent + totalAvenants.precedent),
      actuel: roundToTwoDecimals(totalCommandeInitiale.actuel + totalAvenants.actuel),
      total: roundToTwoDecimals(totalCommandeInitiale.total + totalAvenants.total)
    }

    // Préparer les données pour le template
    const pdfData: EtatAvancementData = {
      numero: etatAvancement.numero,
      date: etatAvancement.date,
      estFinalise: etatAvancement.estFinalise,
      commentaires: etatAvancement.commentaires || undefined,
      
      chantier: {
        nomChantier: chantierEntity.nomChantier,
        adresseChantier: chantierEntity.adresseChantier || '',
        chantierId: chantierEntity.chantierId
      },
      
      // Ne pas inclure les informations client pour les PDF sous-traitants
      client: {
        nom: '',
        adresse: undefined
      },
      
      soustraitant: {
        nom: etatAvancement.soustraitant.nom,
        contact: etatAvancement.soustraitant.contact || undefined
      },
      
      lignes: etatAvancement.ligne_soustraitant_etat_avancement.map(ligne => ({
        article: ligne.article ?? '',
        description: ligne.description ?? '',
        type: ligne.type ?? '',
        unite: ligne.unite ?? '',
        prixUnitaire: num(ligne.prixUnitaire),
        quantite: num(ligne.quantite),
        quantitePrecedente: num(ligne.quantitePrecedente),
        quantiteActuelle: num(ligne.quantiteActuelle),
        quantiteTotale: num(ligne.quantiteTotale),
        montantPrecedent: num(ligne.montantPrecedent),
        montantActuel: num(ligne.montantActuel),
        montantTotal: num(ligne.montantTotal)
      })),
      
      avenants: etatAvancement.avenant_soustraitant_etat_avancement.map(avenant => ({
        article: avenant.article ?? '',
        description: avenant.description ?? '',
        type: avenant.type ?? '',
        unite: avenant.unite ?? '',
        prixUnitaire: num(avenant.prixUnitaire),
        quantite: num(avenant.quantite),
        quantitePrecedente: num(avenant.quantitePrecedente),
        quantiteActuelle: num(avenant.quantiteActuelle),
        quantiteTotale: num(avenant.quantiteTotale),
        montantPrecedent: num(avenant.montantPrecedent),
        montantActuel: num(avenant.montantActuel),
        montantTotal: num(avenant.montantTotal)
      })),
      
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral
    }

    console.log('🎨 Génération du HTML...')
    const __locale = await bindRequestLocale()
    const html = localizeGeneratedHtml(__locale, generateEtatAvancementHTML(pdfData, companySettings, 'soustraitant'), collectStrings(pdfData))
    
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // Nom du fichier
    const fileName = `etat-avancement-soustraitant-${chantierEntity.chantierId}-${etatAvancement.soustraitant.nom.replace(/[^a-zA-Z0-9]/g, '_')}-n${etatAvancement.numero}.pdf`

    // Retourner le PDF
    // Convertir le Buffer en Uint8Array pour compatibilité avec Response
    const uint8Array = new Uint8Array(pdfBuffer)
    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('❌ Erreur génération PDF:', message, stack)
    return localizedJson(
      { error: 'Erreur lors de la génération du PDF', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    )
  }
}
