import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateDevisHTML } from '@/lib/pdf/templates/devis-template'
import { getActiveTemplateHtml } from '@/lib/templates/get-active-template'
import { generateAndStoreCommandePDF } from '@/lib/pdf/commande-pdf-storage'

// POST /api/devis/[devisId]/convert - Convertir un devis ou avenant
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ devisId: string }> }
) {
  await bindRequestLocale()
  const params = await props.params
  const { devisId } = params
  
  // Type pour le devis avec ses relations
  type DevisWithRelations = {
    id: string
    numeroDevis: string
    typeDevis: string
    reference: string | null
    dateCreation: Date
    dateValidite: Date
    statut: string
    observations: string | null
    tauxTVA: number
    remiseGlobale: number
    montantHT: number
    montantTVA: number
    montantTTC: number
    clientId: string
    chantierId: string | null
    client: {
      id: string
      nom: string
      email: string
      telephone: string | null
      adresse: string | null
    }
    chantier: {
      chantierId: string
      nomChantier: string
      adresseChantier: string | null
    } | null
    lignes: Array<{
      id: string
      ordre: number
      type: string
      article: string | null
      description: string | null
      unite: string | null
      quantite: number | null
      prixUnitaire: number | null
      remise: number
      total: number | null
    }>
    createur: {
      id: string
      name: string
      email: string
    }
  }
  
  let devis: DevisWithRelations | null = null
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { chantierId } = body // Pour les DEVIS, chantier à créer ou sélectionné

    devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        client: true,
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            adresseChantier: true
          }
        },
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        },
        createur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!devis) {
      return localizedJson(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    const cgvHtml = await getActiveTemplateHtml('CGV')

    // Vérifier le statut
    if (devis.statut === 'CONVERTI') {
      return localizedJson(
        { error: 'Ce document a déjà été converti' },
        { status: 400 }
      )
    }

    if (devis.statut !== 'ACCEPTE') {
      return localizedJson(
        { error: 'Seuls les documents acceptés peuvent être convertis' },
        { status: 400 }
      )
    }

    // ========================================
    // CAS 1 : DEVIS → Commande + Chantier
    // ========================================
    if (devis.typeDevis === 'DEVIS') {
      if (!chantierId) {
        return localizedJson(
          { error: 'Le chantier est obligatoire pour la conversion d\'un devis' },
          { status: 400 }
        )
      }

      // Vérifier que le chantier existe et appartient au même client
      // Le chantierId peut être soit l'ID primaire (id) soit l'ID métier (chantierId)
      let chantier = await prisma.chantier.findUnique({
        where: { id: chantierId }
      })

      // Si pas trouvé avec l'ID primaire, essayer avec l'ID métier
      if (!chantier) {
        chantier = await prisma.chantier.findUnique({
          where: { chantierId: chantierId }
        })
      }

      if (!chantier) {
        return localizedJson(
          { error: 'Chantier introuvable' },
          { status: 404 }
        )
      }

      if (chantier.clientId !== devis.clientId) {
        return localizedJson(
          { error: 'Le chantier doit appartenir au même client que le devis' },
          { status: 400 }
        )
      }

      // Générer le numéro de commande
      const year = new Date().getFullYear()
      const lastCommande = await prisma.commande.findFirst({
        where: {
          reference: {
            startsWith: `CMD-${year}-`
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      let nextNumber = 1
      if (lastCommande && lastCommande.reference) {
        const parts = lastCommande.reference.split('-')
        if (parts.length >= 3) {
          const lastNumber = parseInt(parts[2])
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1
          }
        }
      }

      const numeroCommande = `CMD-${year}-${nextNumber.toString().padStart(4, '0')}`

      console.log('📦 Création de la commande:', {
        numeroCommande,
        chantierId: chantier.id,
        clientId: devis.clientId,
        sousTotal: devis.montantHT,
        total: devis.montantTTC,
        nombreLignes: devis.lignes.length
      })

      // Créer la commande (utiliser l'ID primaire du chantier)
      const commande = await prisma.commande.create({
        data: {
          reference: numeroCommande,
          chantierId: chantier.id,
          clientId: devis.clientId,
          statut: 'VALIDEE',
          dateCommande: new Date(),
          sousTotal: Number(devis.montantHT) || 0,
          tauxTVA: Number(devis.tauxTVA) || 21,
          tva: Number(devis.montantTVA) || 0,
          total: Number(devis.montantTTC) || 0,
          lignes: {
            create: (() => {
              // Étape 1 : Appliquer les remises de lignes et calculer le total HT après remises de lignes
              const lignesAvecRemiseLigne = devis.lignes.map((ligne) => {
                let prixUnitaireApresRemiseLigne = Number(ligne.prixUnitaire) || 0
                let totalApresRemiseLigne = 0
                
                if (ligne.type === 'QP' && ligne.remise > 0 && ligne.remise < 100) {
                  // Appliquer la remise de ligne au prix unitaire
                  prixUnitaireApresRemiseLigne = prixUnitaireApresRemiseLigne * (1 - ligne.remise / 100)
                  totalApresRemiseLigne = (Number(ligne.quantite) || 0) * prixUnitaireApresRemiseLigne
                } else if (ligne.type === 'QP') {
                  // Pas de remise de ligne, calculer normalement
                  totalApresRemiseLigne = (Number(ligne.quantite) || 0) * prixUnitaireApresRemiseLigne
                }
                
                return {
                  ...ligne,
                  prixUnitaireApresRemiseLigne,
                  totalApresRemiseLigne
                }
              })
              
              // Étape 2 : Calculer le total HT après remises de lignes
              const totalHTApresRemisesLignes = lignesAvecRemiseLigne.reduce(
                (sum, l) => sum + l.totalApresRemiseLigne,
                0
              )
              
              // Étape 3 : Appliquer la remise globale proportionnellement à chaque ligne
              const remiseGlobale = Number(devis.remiseGlobale) || 0
              const montantRemiseGlobale = totalHTApresRemisesLignes * (remiseGlobale / 100)
              
              // Étape 4 : Créer les lignes avec prix unitaire final (remise ligne + remise globale)
              return lignesAvecRemiseLigne.map((ligne) => {
                let prixUnitaireFinal = ligne.prixUnitaireApresRemiseLigne
                let totalFinal = ligne.totalApresRemiseLigne
                
                if (ligne.type === 'QP' && remiseGlobale > 0 && totalHTApresRemisesLignes > 0) {
                  // Appliquer la remise globale proportionnellement
                  const proportion = ligne.totalApresRemiseLigne / totalHTApresRemisesLignes
                  const remiseGlobaleLigne = montantRemiseGlobale * proportion
                  totalFinal = ligne.totalApresRemiseLigne - remiseGlobaleLigne
                  // Recalculer le prix unitaire final
                  const quantite = Number(ligne.quantite) || 0
                  prixUnitaireFinal = quantite > 0 ? totalFinal / quantite : 0
                }
                
                return {
                  ordre: ligne.ordre,
                  type: ligne.type,
                  article: ligne.article,
                  description: ligne.description,
                  unite: ligne.unite,
                  quantite: ligne.quantite || 0,
                  prixUnitaire: prixUnitaireFinal,
                  total: totalFinal,
                  estOption: false
                }
              })
            })()
          }
        },
        include: {
          lignes: {
            orderBy: {
              ordre: 'asc'
            }
          },
          Chantier: {
            include: {
              client: true
            }
          }
        }
      })

      console.log('✅ Commande créée avec succès:', commande.id)

      // Générer et stocker le PDF de la commande dans les documents du chantier
      console.log('📄 Génération automatique du PDF de la commande...')
      generateAndStoreCommandePDF(commande.id, session.user.id).catch((error) => {
        console.error('❌ Erreur lors de la génération automatique du PDF de la commande:', error)
        // Ne pas faire échouer la conversion si la génération du PDF échoue
      })

      // Générer et sauvegarder le PDF dans les documents du chantier
      try {
        console.log('📄 Génération du PDF du devis...')
        const html = generateDevisHTML({
          devis: {
            numeroDevis: devis.numeroDevis,
            dateCreation: devis.dateCreation.toISOString(),
            dateValidite: devis.dateValidite.toISOString(),
            clientNom: devis.client.nom,
            clientEmail: devis.client.email || '',
            clientTelephone: devis.client.telephone || undefined,
            clientAdresse: devis.client.adresse || undefined,
            observations: devis.observations || undefined,
            tauxTVA: Number(devis.tauxTVA),
            remiseGlobale: Number(devis.remiseGlobale),
            montantHT: Number(devis.montantHT),
            montantTVA: Number(devis.montantTVA),
            montantTTC: Number(devis.montantTTC),
            lignes: devis.lignes.map((l) => ({
              id: l.id,
              ordre: l.ordre,
              type: l.type,
              article: l.article,
              description: l.description,
              unite: l.unite,
              quantite: Number(l.quantite) || 0,
              prixUnitaire: Number(l.prixUnitaire) || 0,
              remise: Number(l.remise) || 0,
              total: Number(l.total) || 0
            }))
          },
          entreprise: {
            name: process.env.COMPANY_NAME || 'Nom de l\'entreprise',
            address: process.env.COMPANY_ADDRESS || 'Adresse de l\'entreprise',
            zipCode: process.env.COMPANY_ZIPCODE || 'Code postal',
            city: process.env.COMPANY_CITY || 'Ville',
            phone: process.env.COMPANY_PHONE || 'Téléphone',
            email: process.env.COMPANY_EMAIL || 'email@entreprise.com',
            siret: process.env.COMPANY_SIRET,
            tva: process.env.COMPANY_TVA
          },
          cgvHtml: cgvHtml || undefined
        })

        const pdfBuffer = await PDFGenerator.generatePDF(html, {
          format: 'A4',
          margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        })

        // Sauvegarder le PDF dans les documents du chantier
        // Note: Document.chantierId référence Chantier.chantierId (ID métier), pas Chantier.id
        const pdfUrl = `/api/documents/devis-${devisId}.pdf`
        
        console.log('💾 Sauvegarde du PDF dans les documents...')
        await prisma.document.create({
          data: {
            nom: `Devis ${devis.numeroDevis}${devis.reference ? ` - ${devis.reference}` : ''}.pdf`,
            type: 'PDF',
            url: pdfUrl,
            taille: pdfBuffer.length,
            mimeType: 'application/pdf',
            chantierId: chantier.chantierId,
            createdBy: session.user.id,
            updatedAt: new Date()
          }
        })
        console.log('✅ PDF sauvegardé avec succès')
      } catch (pdfError) {
        console.error('❌ Erreur lors de la génération du PDF:', pdfError)
        // On ne bloque pas la conversion si le PDF échoue
      }

      // Marquer le devis comme converti
      console.log('🔄 Mise à jour du statut du devis...')
      await prisma.devis.update({
        where: { id: devisId },
        data: {
          statut: 'CONVERTI',
          convertedToCommandeId: commande.id
        }
      })

      console.log('✅ Conversion terminée avec succès')
      return localizedJson({
        success: true,
        type: 'DEVIS',
        commande,
        message: 'Devis converti en commande avec succès'
      })
    } 
    
    // ========================================
    // CAS 2 : AVENANT → Ligne dans état d'avancement
    // ========================================
    else if (devis.typeDevis === 'AVENANT') {
      if (!devis.chantierId) {
        return localizedJson(
          { error: 'Aucun chantier associé à cet avenant' },
          { status: 400 }
        )
      }

      console.log('🔍 Recherche du chantier avec chantierId (identifiant métier):', devis.chantierId)

      const chantier = await prisma.chantier.findUnique({
        where: { chantierId: devis.chantierId }
      })

      console.log('🏗️ Chantier trouvé:', chantier ? `${chantier.id} (${chantier.chantierId}) - ${chantier.nomChantier}` : 'AUCUN')

      if (!chantier) {
        return localizedJson(
          { error: `Chantier introuvable avec l'id métier: ${devis.chantierId}` },
          { status: 404 }
        )
      }

      // Chercher un état d'avancement non finalisé (brouillon)
      // IMPORTANT: EtatAvancement.chantierId référence Chantier.id (clé primaire)
      let etatAvancement = await prisma.etatAvancement.findFirst({
        where: {
          chantierId: chantier.id, // ← Utiliser chantier.id, pas devis.chantierId
          estFinalise: false
        },
        include: {
          avenants: true
        }
      })

      console.log('📋 État d\'avancement trouvé:', etatAvancement ? `#${etatAvancement.numero}` : 'AUCUN')

      // Si aucun état d'avancement brouillon, en créer un
      if (!etatAvancement) {
        const year = new Date().getFullYear()
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
        
        // Compter les états existants
        const existingEtatsCount = await prisma.etatAvancement.count({
          where: { chantierId: chantier.id }
        })

        const lastEtat = await prisma.etatAvancement.findFirst({
          where: { chantierId: chantier.id },
          orderBy: { numero: 'desc' },
          include: {
            lignes: {
              orderBy: {
                ligneCommandeId: 'asc'
              }
            }
          }
        })

        const nextNumero = lastEtat ? lastEtat.numero + 1 : 1

        etatAvancement = await prisma.etatAvancement.create({
          data: {
            chantierId: chantier.id,
            numero: nextNumero,
            mois: `${year}-${month}`,
            date: new Date(),
            estFinalise: false,
            commentaires: devis.observations || null,
            createdBy: session.user.id
          },
          include: {
            avenants: true,
            lignes: true
          }
        })

        console.log('✨ Nouvel état d\'avancement créé:', etatAvancement.numero)

        // Si c'est le premier état, charger les lignes de la commande
        if (existingEtatsCount === 0) {
          console.log('📦 Premier état, chargement de la commande de base...')
          const commande = await prisma.commande.findFirst({
            where: {
              chantierId: chantier.id,
              statut: 'VALIDEE'
            },
            include: {
              lignes: true
            }
          })

          if (commande && commande.lignes.length > 0) {
            console.log(`📝 Création de ${commande.lignes.length} lignes à partir de la commande...`)
            await Promise.all(commande.lignes.map(ligne =>
              prisma.ligneEtatAvancement.create({
                data: {
                  etatAvancementId: etatAvancement.id,
                  ligneCommandeId: ligne.id,
                  article: ligne.article,
                  description: ligne.description,
                  type: ligne.type,
                  unite: ligne.unite,
                  prixUnitaire: Number(ligne.prixUnitaire) || 0,
                  quantite: Number(ligne.quantite) || 0,
                  quantitePrecedente: 0,
                  quantiteActuelle: 0,
                  quantiteTotale: 0,
                  montantPrecedent: 0,
                  montantActuel: 0,
                  montantTotal: 0
                }
              })
            ))
            console.log('✅ Lignes de commande créées avec succès')
          } else {
            console.log('⚠️ Aucune commande validée ou commande sans lignes')
          }
        } else if (lastEtat && lastEtat.lignes.length > 0) {
          // Si ce n'est pas le premier état, copier les lignes du dernier état
          console.log(`📋 Copie de ${lastEtat.lignes.length} lignes du dernier état...`)
          await Promise.all(lastEtat.lignes.map(ligne =>
            prisma.ligneEtatAvancement.create({
              data: {
                etatAvancementId: etatAvancement.id,
                ligneCommandeId: ligne.ligneCommandeId,
                article: ligne.article,
                description: ligne.description,
                type: ligne.type,
                unite: ligne.unite,
                prixUnitaire: ligne.prixUnitaire,
                quantite: ligne.quantite,
                quantitePrecedente: ligne.quantiteTotale,
                quantiteActuelle: 0,
                quantiteTotale: ligne.quantiteTotale,
                montantPrecedent: ligne.montantTotal,
                montantActuel: 0,
                montantTotal: ligne.montantTotal
              }
            })
          ))
          console.log('✅ Lignes copiées avec succès')
        }
      }

      // Calculer les montants
      const montantHT = Number(devis.montantHT)

      // Créer la description de l'avenant
      const description = `${devis.numeroDevis}${devis.reference ? ` - ${devis.reference}` : ''}`

      // Ajouter l'avenant à l'état d'avancement
      await prisma.avenantEtatAvancement.create({
        data: {
          etatAvancementId: etatAvancement.id,
          article: 'AVENANT',
          description,
          type: 'AVENANT',
          unite: 'Forfait',
          prixUnitaire: montantHT,
          quantite: 1,
          quantitePrecedente: 0,
          quantiteActuelle: 1,
          quantiteTotale: 1,
          montantPrecedent: 0,
          montantActuel: montantHT,
          montantTotal: montantHT
        }
      })

      console.log('💰 Avenant ajouté à l\'état d\'avancement')

      // Recalculer les totaux de l'état d'avancement
      const allAvenants = await prisma.avenantEtatAvancement.findMany({
        where: { etatAvancementId: etatAvancement.id }
      })

      const allLignes = await prisma.ligneEtatAvancement.findMany({
        where: { etatAvancementId: etatAvancement.id }
      })

      const totalAvenants = allAvenants.reduce((sum, a) => sum + Number(a.montantActuel || 0), 0)
      const totalLignes = allLignes.reduce((sum, l) => sum + Number(l.montantActuel || 0), 0)

      console.log('📊 Totaux recalculés - Avenants:', totalAvenants, 'Lignes:', totalLignes)

      // Générer et sauvegarder le PDF dans les documents du chantier
      try {
        const html = generateDevisHTML({
          devis: {
            numeroDevis: devis.numeroDevis,
            dateCreation: devis.dateCreation.toISOString(),
            dateValidite: devis.dateValidite.toISOString(),
            clientNom: devis.client.nom,
            clientEmail: devis.client.email || '',
            clientTelephone: devis.client.telephone || undefined,
            clientAdresse: devis.client.adresse || undefined,
            observations: devis.observations || undefined,
            tauxTVA: Number(devis.tauxTVA),
            remiseGlobale: Number(devis.remiseGlobale),
            montantHT: Number(devis.montantHT),
            montantTVA: Number(devis.montantTVA),
            montantTTC: Number(devis.montantTTC),
            lignes: devis.lignes.map((l) => ({
              id: l.id,
              ordre: l.ordre,
              type: l.type,
              article: l.article,
              description: l.description,
              unite: l.unite,
              quantite: Number(l.quantite) || 0,
              prixUnitaire: Number(l.prixUnitaire) || 0,
              remise: Number(l.remise) || 0,
              total: Number(l.total) || 0
            }))
          },
          entreprise: {
            name: process.env.COMPANY_NAME || 'Nom de l\'entreprise',
            address: process.env.COMPANY_ADDRESS || 'Adresse de l\'entreprise',
            zipCode: process.env.COMPANY_ZIPCODE || 'Code postal',
            city: process.env.COMPANY_CITY || 'Ville',
            phone: process.env.COMPANY_PHONE || 'Téléphone',
            email: process.env.COMPANY_EMAIL || 'email@entreprise.com',
            siret: process.env.COMPANY_SIRET,
            tva: process.env.COMPANY_TVA
          },
          cgvHtml: cgvHtml || undefined
        })

        const pdfBuffer = await PDFGenerator.generatePDF(html, {
          format: 'A4',
          margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        })

        // Sauvegarder le PDF dans les documents du chantier
        const pdfUrl = `/api/documents/avenant-${devisId}.pdf`
        
        await prisma.document.create({
          data: {
            nom: `Avenant ${devis.numeroDevis}${devis.reference ? ` - ${devis.reference}` : ''}.pdf`,
            type: 'PDF',
            url: pdfUrl,
            taille: pdfBuffer.length,
            mimeType: 'application/pdf',
            chantierId: devis.chantierId,
            createdBy: session.user.id,
            updatedAt: new Date()
          }
        })
      } catch (pdfError) {
        console.error('Erreur lors de la génération du PDF:', pdfError)
        // On ne bloque pas la conversion si le PDF échoue
      }

      // Marquer l'avenant comme converti
      await prisma.devis.update({
        where: { id: devisId },
        data: {
          statut: 'CONVERTI',
          convertedToEtatId: String(etatAvancement.id)
        }
      })

      return localizedJson({
        success: true,
        type: 'AVENANT',
        etatAvancement: {
          id: etatAvancement.id,
          numero: etatAvancement.numero,
          chantierId: devis.chantierId
        },
        message: 'Avenant ajouté à l\'état d\'avancement avec succès'
      })
    } else {
      return localizedJson(
        { error: 'Type de devis invalide' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Erreur lors de la conversion:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Détails de l\'erreur:', {
      message: errorMessage,
      stack: errorStack,
      devisId,
      typeDevis: devis?.typeDevis
    })
    return localizedJson(
      { 
        error: 'Erreur lors de la conversion',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
