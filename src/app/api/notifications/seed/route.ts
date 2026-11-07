import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// Données de seed pour les types de notifications
const notificationTypes = [
  // CHANTIERS
  {
    code: 'CHANTIER_CREE',
    libelle: 'Nouveau chantier créé',
    description: 'Un nouveau chantier a été créé dans le système',
    categorie: 'CHANTIER',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Nouveau chantier créé : [CHANTIER_NOM] par [USER_NAME]',
    emailSubject: 'Nouveau chantier créé',
  },
  {
    code: 'CHANTIER_DEMARRE',
    libelle: 'Chantier démarré',
    description: 'Un chantier a été démarré',
    categorie: 'CHANTIER',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Le chantier [CHANTIER_NOM] a démarré le [DATE]',
    emailSubject: 'Chantier démarré - [CHANTIER_NOM]',
  },
  {
    code: 'CHANTIER_TERMINE',
    libelle: 'Chantier terminé',
    description: 'Un chantier a été marqué comme terminé',
    categorie: 'CHANTIER',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Le chantier [CHANTIER_NOM] est terminé',
    emailSubject: 'Chantier terminé - [CHANTIER_NOM]',
  },
  {
    code: 'CHANTIER_MODIFIE',
    libelle: 'Chantier modifié',
    description: 'Les informations d\'un chantier ont été modifiées',
    categorie: 'CHANTIER',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Chantier [CHANTIER_NOM] modifié par [USER_NAME]',
    emailSubject: 'Chantier modifié - [CHANTIER_NOM]',
  },

  // MÉTRÉS
  {
    code: 'METRE_SOUMIS',
    libelle: 'Métré soumis par sous-traitant',
    description: 'Un sous-traitant a soumis un métré pour validation',
    categorie: 'METRE',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: '[SOUSTRAITANT_NOM] a soumis un métré pour le chantier [CHANTIER_NOM]',
    emailSubject: 'Nouveau métré à valider - [CHANTIER_NOM]',
  },
  {
    code: 'METRE_VALIDE',
    libelle: 'Métré validé',
    description: 'Un métré a été validé',
    categorie: 'METRE',
    rolesParDefaut: [],
    inAppTemplate: 'Votre métré pour [CHANTIER_NOM] a été validé par [USER_NAME]',
    emailSubject: 'Métré validé - [CHANTIER_NOM]',
  },
  {
    code: 'METRE_REJETE',
    libelle: 'Métré rejeté',
    description: 'Un métré a été rejeté',
    categorie: 'METRE',
    rolesParDefaut: [],
    inAppTemplate: 'Votre métré pour [CHANTIER_NOM] a été rejeté',
    emailSubject: 'Métré rejeté - [CHANTIER_NOM]',
  },

  // BONS DE RÉGIE
  {
    code: 'BON_REGIE_CREE',
    libelle: 'Nouveau bon de régie',
    description: 'Un nouveau bon de régie a été créé',
    categorie: 'ADMINISTRATIF',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Nouveau bon de régie signé par [CLIENT] pour [CHANTIER_NOM]',
    emailSubject: 'Nouveau bon de régie',
  },
  {
    code: 'BON_REGIE_ASSOCIE',
    libelle: 'Bon de régie associé',
    description: 'Un bon de régie a été associé à un chantier',
    categorie: 'ADMINISTRATIF',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Bon de régie n°[ID] associé au chantier [CHANTIER_NOM]',
    emailSubject: 'Bon de régie associé',
  },

  // DOCUMENTS
  {
    code: 'DOCUMENT_UPLOAD',
    libelle: 'Document uploadé',
    description: 'Un nouveau document a été ajouté',
    categorie: 'DOCUMENT',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Nouveau document [NOM] ajouté sur [CHANTIER_NOM]',
    emailSubject: 'Nouveau document - [CHANTIER_NOM]',
  },
  {
    code: 'DOCUMENT_EXPIRE',
    libelle: 'Document expiré',
    description: 'Un document a expiré',
    categorie: 'DOCUMENT',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: '⚠️ Document [NOM] expiré',
    emailSubject: 'Document expiré - Action requise',
  },
  {
    code: 'DOCUMENT_EXPIRE_BIENTOT',
    libelle: 'Document expire bientôt',
    description: 'Un document va expirer dans les 30 prochains jours',
    categorie: 'DOCUMENT',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: '⚠️ Document [NOM] expire le [DATE]',
    emailSubject: 'Document expirant prochainement',
  },

  // RÉCEPTIONS
  {
    code: 'RECEPTION_CREEE',
    libelle: 'Nouvelle réception créée',
    description: 'Une nouvelle réception de chantier a été créée',
    categorie: 'RECEPTION',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Réception créée pour [CHANTIER_NOM] - Deadline : [DATE]',
    emailSubject: 'Nouvelle réception - [CHANTIER_NOM]',
  },
  {
    code: 'RECEPTION_DEADLINE_7J',
    libelle: 'Deadline réception dans 7 jours',
    description: 'Une réception arrive à échéance dans 7 jours',
    categorie: 'RECEPTION',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: '⏰ Réception [CHANTIER_NOM] - Deadline dans 7 jours',
    emailSubject: 'Rappel réception - [CHANTIER_NOM]',
  },
  {
    code: 'RECEPTION_FINALISEE',
    libelle: 'Réception finalisée',
    description: 'Une réception a été finalisée',
    categorie: 'RECEPTION',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: '✅ Réception [CHANTIER_NOM] finalisée par [USER_NAME]',
    emailSubject: 'Réception finalisée - [CHANTIER_NOM]',
  },

  // REMARQUES
  {
    code: 'REMARQUE_CREEE',
    libelle: 'Nouvelle remarque',
    description: 'Une nouvelle remarque a été créée',
    categorie: 'RECEPTION',
    rolesParDefaut: [],
    inAppTemplate: 'Nouvelle remarque sur [CHANTIER_NOM]',
    emailSubject: 'Nouvelle remarque - [CHANTIER_NOM]',
  },
  {
    code: 'REMARQUE_RESOLUE',
    libelle: 'Remarque résolue',
    description: 'Une remarque a été marquée comme résolue',
    categorie: 'RECEPTION',
    rolesParDefaut: [],
    inAppTemplate: '✅ Remarque résolue sur [CHANTIER_NOM] par [USER_NAME]',
    emailSubject: 'Remarque résolue - [CHANTIER_NOM]',
  },
  {
    code: 'REMARQUE_VALIDEE',
    libelle: 'Remarque validée',
    description: 'La résolution d\'une remarque a été validée',
    categorie: 'RECEPTION',
    rolesParDefaut: [],
    inAppTemplate: '✅ Votre résolution sur [CHANTIER_NOM] a été validée',
    emailSubject: 'Résolution validée - [CHANTIER_NOM]',
  },

  // SAV
  {
    code: 'SAV_TICKET_CREE',
    libelle: 'Nouveau ticket SAV',
    description: 'Un nouveau ticket SAV a été créé',
    categorie: 'SAV',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: '🔧 Nouveau ticket SAV [NUM] : [TITRE] - Priorité : [PRIORITE]',
    emailSubject: 'Nouveau ticket SAV - [NUM]',
  },
  {
    code: 'SAV_TICKET_ASSIGNE',
    libelle: 'Ticket SAV assigné',
    description: 'Un ticket SAV vous a été assigné',
    categorie: 'SAV',
    rolesParDefaut: [],
    inAppTemplate: 'Ticket SAV [NUM] vous a été assigné : [TITRE]',
    emailSubject: 'Ticket SAV assigné - [NUM]',
  },
  {
    code: 'SAV_INTERVENTION_PLANIFIEE',
    libelle: 'Intervention SAV planifiée',
    description: 'Une intervention SAV a été planifiée',
    categorie: 'SAV',
    rolesParDefaut: [],
    inAppTemplate: 'Intervention SAV [NUM] planifiée le [DATE]',
    emailSubject: 'Intervention planifiée - [NUM]',
  },
  {
    code: 'SAV_TICKET_RESOLU',
    libelle: 'Ticket SAV résolu',
    description: 'Un ticket SAV a été résolu',
    categorie: 'SAV',
    rolesParDefaut: [],
    inAppTemplate: '✅ Ticket SAV [NUM] résolu : [TITRE]',
    emailSubject: 'Ticket SAV résolu - [NUM]',
  },

  // PLANNING & TÂCHES
  {
    code: 'TACHE_ASSIGNEE',
    libelle: 'Tâche assignée',
    description: 'Une tâche vous a été assignée',
    categorie: 'PLANNING',
    rolesParDefaut: [],
    inAppTemplate: 'Tâche [TITRE] vous a été assignée pour [DATE]',
    emailSubject: 'Nouvelle tâche assignée',
  },
  {
    code: 'TACHE_DEMAIN',
    libelle: 'Tâche prévue demain',
    description: 'Rappel d\'une tâche programmée demain',
    categorie: 'PLANNING',
    rolesParDefaut: [],
    inAppTemplate: '⏰ Rappel : Tâche [TITRE] prévue demain sur [CHANTIER_NOM]',
    emailSubject: 'Rappel tâche demain',
  },

  // PHOTOS
  {
    code: 'PHOTOS_UPLOADEES',
    libelle: 'Photos uploadées',
    description: 'De nouvelles photos ont été ajoutées',
    categorie: 'CHANTIER',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: '📸 [NB] photo(s) ajoutée(s) sur [CHANTIER_NOM] par [UPLOADER]',
    emailSubject: 'Nouvelles photos - [CHANTIER_NOM]',
  },

  // CONTRATS
  {
    code: 'CONTRAT_GENERE',
    libelle: 'Contrat généré',
    description: 'Un contrat a été généré et envoyé',
    categorie: 'SOUS_TRAITANT',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: '📄 Contrat généré et envoyé à [SOUSTRAITANT_NOM]',
    emailSubject: 'Contrat généré',
  },
  {
    code: 'CONTRAT_SIGNE',
    libelle: 'Contrat signé',
    description: 'Un contrat a été signé',
    categorie: 'SOUS_TRAITANT',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: '✅ Contrat signé par [SOUSTRAITANT_NOM]',
    emailSubject: 'Contrat signé',
  },

  // COMMANDES
  {
    code: 'COMMANDE_CREEE',
    libelle: 'Nouvelle commande',
    description: 'Une nouvelle commande a été créée',
    categorie: 'COMMANDE',
    rolesParDefaut: ['ADMIN', 'MANAGER'],
    inAppTemplate: 'Nouvelle commande créée pour [CHANTIER_NOM] - [MONTANT]€',
    emailSubject: 'Nouvelle commande - [CHANTIER_NOM]',
  },
  {
    code: 'COMMANDE_SST_CREEE',
    libelle: 'Commande sous-traitant',
    description: 'Une commande sous-traitant a été créée',
    categorie: 'COMMANDE',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: 'Nouvelle commande pour [SOUSTRAITANT_NOM] sur [CHANTIER_NOM] - [MONTANT]€',
    emailSubject: 'Nouvelle commande',
  },

  // SYSTÈME
  {
    code: 'ERREUR_CRITIQUE',
    libelle: 'Erreur système critique',
    description: 'Une erreur critique s\'est produite',
    categorie: 'SYSTEME',
    rolesParDefaut: ['ADMIN'],
    inAppTemplate: '🚨 ERREUR CRITIQUE : [MESSAGE]',
    emailSubject: 'ERREUR CRITIQUE SYSTÈME',
  },
]

// POST /api/notifications/seed - Seeder les types de notifications (ADMIN uniquement)
export async function POST(_request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    // Créer ou mettre à jour tous les types
    const results = await Promise.all(
      notificationTypes.map(type =>
        prisma.notificationType.upsert({
          where: { code: type.code },
          create: {
            ...type,
            rolesParDefaut: type.rolesParDefaut,
          },
          update: {
            libelle: type.libelle,
            description: type.description,
            categorie: type.categorie,
            rolesParDefaut: type.rolesParDefaut,
            inAppTemplate: type.inAppTemplate,
            emailSubject: type.emailSubject,
            actif: true,
          },
        })
      )
    )

    return localizedJson({
      success: true,
      count: results.length,
      message: `${results.length} types de notifications initialisés`,
    })
  } catch (error) {
    console.error('Erreur lors du seeding:', error)
    return localizedJson(
      { error: 'Erreur lors du seeding des types de notifications' },
      { status: 500 }
    )
  }
}

