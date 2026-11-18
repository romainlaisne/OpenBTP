-- AlterTable
ALTER TABLE `Chantier` ADD COLUMN `bureauArchitectureAdresse` VARCHAR(191) NULL,
    ADD COLUMN `bureauArchitectureLocalite` VARCHAR(191) NULL,
    ADD COLUMN `bureauArchitectureNom` VARCHAR(191) NULL,
    ADD COLUMN `maitreOuvrageAdresse` VARCHAR(191) NULL,
    ADD COLUMN `maitreOuvrageLocalite` VARCHAR(191) NULL,
    ADD COLUMN `maitreOuvrageNom` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Client` ADD COLUMN `numeroTva` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Document` MODIFY `chantierId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `companysettings` MODIFY `iban` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contrat` ADD COLUMN `signatureConsentement` BOOLEAN NULL,
    ADD COLUMN `signatureHorodatageCertifie` DATETIME(3) NULL,
    ADD COLUMN `signatureIP` VARCHAR(191) NULL,
    ADD COLUMN `signatureIdentiteConfirmee` BOOLEAN NULL,
    ADD COLUMN `signatureUserAgent` TEXT NULL;

-- AlterTable
ALTER TABLE `soustraitant` ADD COLUMN `logo` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `contrat_signature_audit` (
    `id` VARCHAR(191) NOT NULL,
    `contratId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` TEXT NULL,
    `emailSignataire` VARCHAR(191) NULL,
    `nomSignataire` VARCHAR(191) NULL,

    INDEX `contrat_signature_audit_contratId_idx`(`contratId`),
    INDEX `contrat_signature_audit_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dossier_technique` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'BROUILLON',
    `url` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL,
    `dateGeneration` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateModification` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `includeTableOfContents` BOOLEAN NOT NULL DEFAULT false,

    INDEX `dossier_technique_chantierId_idx`(`chantierId`),
    INDEX `dossier_technique_createdBy_idx`(`createdBy`),
    INDEX `dossier_technique_dateGeneration_idx`(`dateGeneration`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dossier_fiche` (
    `id` VARCHAR(191) NOT NULL,
    `dossierId` VARCHAR(191) NOT NULL,
    `ficheId` VARCHAR(191) NOT NULL,
    `ficheReference` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `statut` ENUM('VALIDEE', 'A_REMPLACER', 'NOUVELLE_PROPOSITION', 'BROUILLON') NOT NULL DEFAULT 'BROUILLON',
    `ordre` INTEGER NOT NULL,
    `ficheRemplaceeId` VARCHAR(191) NULL,
    `soustraitantId` VARCHAR(191) NULL,
    `remarques` TEXT NULL,
    `dateAjout` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dossier_fiche_dossierId_idx`(`dossierId`),
    INDEX `dossier_fiche_ficheId_idx`(`ficheId`),
    INDEX `dossier_fiche_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_soustraitant` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `commandeId` INTEGER NULL,
    `statut` ENUM('BROUILLON', 'SOUMIS', 'VALIDE', 'PARTIELLEMENT_VALIDE', 'REJETE') NOT NULL DEFAULT 'BROUILLON',
    `commentaire` TEXT NULL,
    `piecesJointes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metre_soustraitant_chantierId_idx`(`chantierId`),
    INDEX `metre_soustraitant_soustraitantId_idx`(`soustraitantId`),
    INDEX `metre_soustraitant_commandeId_idx`(`commandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_ligne` (
    `id` VARCHAR(191) NOT NULL,
    `metreId` VARCHAR(191) NOT NULL,
    `ligneCommandeId` INTEGER NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL DEFAULT 0,
    `estSupplement` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metre_ligne_metreId_idx`(`metreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_chantier` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaire` TEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metre_chantier_chantierId_idx`(`chantierId`),
    INDEX `metre_chantier_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_categorie` (
    `id` VARCHAR(191) NOT NULL,
    `metreChantierId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL DEFAULT 'm²',
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metre_categorie_metreChantierId_idx`(`metreChantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_chantier_ligne` (
    `id` VARCHAR(191) NOT NULL,
    `categorieId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL DEFAULT 'm²',
    `longueur` DOUBLE NULL,
    `largeur` DOUBLE NULL,
    `hauteur` DOUBLE NULL,
    `quantite` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metre_chantier_ligne_categorieId_idx`(`categorieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_ouvrier` (
    `id` VARCHAR(191) NOT NULL,
    `ouvrierId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `heureDebut` VARCHAR(191) NOT NULL,
    `heureFin` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NULL,
    `lieuLibre` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `photos` JSON NULL,
    `estValide` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `modifiableJusquA` DATETIME(3) NOT NULL,

    INDEX `journal_ouvrier_ouvrierId_idx`(`ouvrierId`),
    INDEX `journal_ouvrier_date_idx`(`date`),
    INDEX `journal_ouvrier_estValide_idx`(`estValide`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pays` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `icone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pays_nom_key`(`nom`),
    UNIQUE INDEX `pays_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usine` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `paysId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usine_nom_paysId_key`(`nom`, `paysId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chargement` (
    `id` VARCHAR(191) NOT NULL,
    `usineId` VARCHAR(191) NOT NULL,
    `contenu` VARCHAR(191) NOT NULL,
    `semaine` INTEGER NOT NULL,
    `estCharge` BOOLEAN NOT NULL DEFAULT false,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateChargement` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chargement_usineId_idx`(`usineId`),
    INDEX `chargement_semaine_idx`(`semaine`),
    INDEX `chargement_estCharge_idx`(`estCharge`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ragconversations` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `messages` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photos_externes` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `uploadedByType` ENUM('OUVRIER_INTERNE', 'SOUSTRAITANT', 'MAGASINIER') NOT NULL,
    `uploadedByName` VARCHAR(191) NOT NULL,
    `urls` TEXT NOT NULL,
    `description` TEXT NULL,
    `dateUpload` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `photos_externes_chantierId_idx`(`chantierId`),
    INDEX `photos_externes_uploadedBy_idx`(`uploadedBy`),
    INDEX `photos_externes_dateUpload_idx`(`dateUpload`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `choix_clients` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NULL,
    `nomClient` VARCHAR(191) NOT NULL,
    `telephoneClient` VARCHAR(191) NULL,
    `emailClient` VARCHAR(191) NULL,
    `dateVisite` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('BROUILLON', 'PRE_CHOIX', 'CHOIX_DEFINITIF') NOT NULL DEFAULT 'BROUILLON',
    `planOriginal` VARCHAR(191) NULL,
    `planAnnote` VARCHAR(191) NULL,
    `planAnnoteData` JSON NULL,
    `notesGenerales` TEXT NULL,
    `documents` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `choix_clients_chantierId_idx`(`chantierId`),
    INDEX `choix_clients_createdBy_idx`(`createdBy`),
    INDEX `choix_clients_dateVisite_idx`(`dateVisite`),
    INDEX `choix_clients_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `details_choix` (
    `id` VARCHAR(191) NOT NULL,
    `choixClientId` VARCHAR(191) NOT NULL,
    `numeroChoix` INTEGER NOT NULL,
    `couleurPlan` VARCHAR(191) NOT NULL,
    `localisations` JSON NOT NULL,
    `type` ENUM('SOL', 'MUR', 'DECOR') NOT NULL DEFAULT 'SOL',
    `marque` VARCHAR(191) NOT NULL,
    `collection` VARCHAR(191) NULL,
    `modele` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `couleur` VARCHAR(191) NULL,
    `formatLongueur` DECIMAL(10, 2) NULL,
    `formatLargeur` DECIMAL(10, 2) NULL,
    `epaisseur` DECIMAL(10, 2) NULL,
    `finition` ENUM('BRILLANT', 'MAT', 'SATINE', 'STRUCTURE', 'POLI', 'ANTIDERAPANT') NULL,
    `surfaceEstimee` DECIMAL(10, 2) NULL,
    `couleurJoint` VARCHAR(191) NULL,
    `largeurJoint` DECIMAL(10, 2) NULL,
    `typeJoint` ENUM('EPOXY', 'CIMENT', 'SILICONE', 'POLYURETHANE') NULL,
    `typePose` VARCHAR(191) NULL,
    `sensPose` VARCHAR(191) NULL,
    `particularitesPose` TEXT NULL,
    `photosShowroom` JSON NULL,
    `notes` TEXT NULL,
    `zoneDessineeData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `details_choix_choixClientId_idx`(`choixClientId`),
    INDEX `details_choix_numeroChoix_idx`(`numeroChoix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chantier_gestionnaires` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chantier_gestionnaires_chantierId_idx`(`chantierId`),
    INDEX `chantier_gestionnaires_userId_idx`(`userId`),
    UNIQUE INDEX `chantier_gestionnaires_chantierId_userId_key`(`chantierId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metre_plan` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NULL,
    `mplanUrl` VARCHAR(191) NOT NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `shareToken` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `metre_plan_shareToken_key`(`shareToken`),
    INDEX `metre_plan_chantierId_idx`(`chantierId`),
    INDEX `metre_plan_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contrat_signature_audit` ADD CONSTRAINT `contrat_signature_audit_contratId_fkey` FOREIGN KEY (`contratId`) REFERENCES `contrat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dossier_technique` ADD CONSTRAINT `dossier_technique_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dossier_technique` ADD CONSTRAINT `dossier_technique_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dossier_fiche` ADD CONSTRAINT `dossier_fiche_dossierId_fkey` FOREIGN KEY (`dossierId`) REFERENCES `dossier_technique`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dossier_fiche` ADD CONSTRAINT `dossier_fiche_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_soustraitant` ADD CONSTRAINT `metre_soustraitant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_soustraitant` ADD CONSTRAINT `metre_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_soustraitant` ADD CONSTRAINT `metre_soustraitant_commandeId_fkey` FOREIGN KEY (`commandeId`) REFERENCES `commande_soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_ligne` ADD CONSTRAINT `metre_ligne_metreId_fkey` FOREIGN KEY (`metreId`) REFERENCES `metre_soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_chantier` ADD CONSTRAINT `metre_chantier_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_chantier` ADD CONSTRAINT `metre_chantier_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_categorie` ADD CONSTRAINT `metre_categorie_metreChantierId_fkey` FOREIGN KEY (`metreChantierId`) REFERENCES `metre_chantier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_chantier_ligne` ADD CONSTRAINT `metre_chantier_ligne_categorieId_fkey` FOREIGN KEY (`categorieId`) REFERENCES `metre_categorie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_ouvrier` ADD CONSTRAINT `journal_ouvrier_ouvrierId_fkey` FOREIGN KEY (`ouvrierId`) REFERENCES `ouvrier_interne`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_ouvrier` ADD CONSTRAINT `journal_ouvrier_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usine` ADD CONSTRAINT `usine_paysId_fkey` FOREIGN KEY (`paysId`) REFERENCES `pays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chargement` ADD CONSTRAINT `chargement_usineId_fkey` FOREIGN KEY (`usineId`) REFERENCES `usine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ragconversations` ADD CONSTRAINT `ragconversations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photos_externes` ADD CONSTRAINT `photos_externes_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `choix_clients` ADD CONSTRAINT `choix_clients_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `choix_clients` ADD CONSTRAINT `choix_clients_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `details_choix` ADD CONSTRAINT `details_choix_choixClientId_fkey` FOREIGN KEY (`choixClientId`) REFERENCES `choix_clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chantier_gestionnaires` ADD CONSTRAINT `chantier_gestionnaires_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chantier_gestionnaires` ADD CONSTRAINT `chantier_gestionnaires_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_plan` ADD CONSTRAINT `metre_plan_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metre_plan` ADD CONSTRAINT `metre_plan_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
