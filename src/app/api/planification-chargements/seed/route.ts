import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST - Créer des données de test pour la planification
export async function POST() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Supprimer les anciennes données
    await prisma.chargement.deleteMany()
    await prisma.usine.deleteMany()
    await prisma.pays.deleteMany()

    // Créer les pays
    const espagne = await prisma.pays.create({
      data: {
        nom: 'Espagne',
        code: 'ES',
        icone: '🇪🇸'
      }
    })

    const france = await prisma.pays.create({
      data: {
        nom: 'France',
        code: 'FR',
        icone: '🇫🇷'
      }
    })

    const italie = await prisma.pays.create({
      data: {
        nom: 'Italie',
        code: 'IT',
        icone: '🇮🇹'
      }
    })

    // Créer les usines
    const tau = await prisma.usine.create({
      data: {
        nom: 'Tau',
        paysId: espagne.id
      }
    })

    const cementech = await prisma.usine.create({
      data: {
        nom: 'Cementech',
        paysId: espagne.id
      }
    })

    const paradyz = await prisma.usine.create({
      data: {
        nom: 'Paradyz',
        paysId: france.id
      }
    })

    const aco = await prisma.usine.create({
      data: {
        nom: 'Aco',
        paysId: italie.id
      }
    })

    // Calculer les semaines de l'année pour les données de test
    const now = new Date()
    const currentYear = now.getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    // Créer des chargements de test
    await prisma.chargement.createMany({
      data: [
        // Espagne - Tau
        {
          usineId: tau.id,
          contenu: '10T',
          semaine: currentWeek,
          estCharge: false
        },
        {
          usineId: tau.id,
          contenu: '5T CMD-1234',
          semaine: currentWeek,
          estCharge: false
        },
        {
          usineId: tau.id,
          contenu: '8T',
          semaine: currentWeek + 1,
          estCharge: false
        },
        // Espagne - Cementech
        {
          usineId: cementech.id,
          contenu: '12T CMD-5678',
          semaine: currentWeek,
          estCharge: true,
          dateChargement: new Date()
        },
        {
          usineId: cementech.id,
          contenu: '6T',
          semaine: currentWeek + 1,
          estCharge: false
        },
        // France - Paradyz
        {
          usineId: paradyz.id,
          contenu: '15T',
          semaine: currentWeek,
          estCharge: false
        },
        {
          usineId: paradyz.id,
          contenu: 'CMD-9999',
          semaine: currentWeek + 2,
          estCharge: false
        },
        // Italie - Aco
        {
          usineId: aco.id,
          contenu: '20T Urgent',
          semaine: currentWeek,
          estCharge: false
        }
      ]
    })

    return localizedJson({ 
      message: 'Données de test créées avec succès',
      pays: 3,
      usines: 4,
      chargements: 8
    })
  } catch (error) {
    console.error('Erreur lors de la création des données de test:', error)
    return localizedJson(
      { error: 'Erreur lors de la création des données de test' },
      { status: 500 }
    )
  }
}
