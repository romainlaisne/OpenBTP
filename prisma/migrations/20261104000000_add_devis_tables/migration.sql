-- CreateTable
CREATE TABLE `devis` (
    `id` VARCHAR(191) NOT NULL,
    `numeroDevis` VARCHAR(191) NOT NULL,
    `typeDevis` ENUM('DEVIS', 'AVENANT') NOT NULL DEFAULT 'DEVIS',
    `reference` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NULL,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateValidite` DATETIME(3) NOT NULL,
    `statut` ENUM('BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'CONVERTI', 'EXPIRE') NOT NULL DEFAULT 'BROUILLON',
    `observations` TEXT NULL,
    `tauxTVA` DECIMAL(5, 2) NOT NULL DEFAULT 21,
    `remiseGlobale` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `montantHT` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `montantTVA` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `montantTTC` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdBy` VARCHAR(191) NOT NULL,
    `convertedToCommandeId` INTEGER NULL,
    `convertedToEtatId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `devis_numeroDevis_key`(`numeroDevis`),
    UNIQUE INDEX `devis_convertedToCommandeId_key`(`convertedToCommandeId`),
    INDEX `devis_clientId_idx`(`clientId`),
    INDEX `devis_chantierId_idx`(`chantierId`),
    INDEX `devis_statut_idx`(`statut`),
    INDEX `devis_typeDevis_idx`(`typeDevis`),
    INDEX `devis_dateCreation_idx`(`dateCreation`),
    INDEX `devis_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_devis` (
    `id` VARCHAR(191) NOT NULL,
    `devisId` VARCHAR(191) NOT NULL,
    `ordre` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `article` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `unite` VARCHAR(191) NULL,
    `quantite` DECIMAL(10, 2) NULL,
    `prixUnitaire` DECIMAL(10, 2) NULL,
    `remise` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_devis_devisId_idx`(`devisId`),
    INDEX `ligne_devis_ordre_idx`(`ordre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `devis` ADD CONSTRAINT `devis_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devis` ADD CONSTRAINT `devis_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devis` ADD CONSTRAINT `devis_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_devis` ADD CONSTRAINT `ligne_devis_devisId_fkey` FOREIGN KEY (`devisId`) REFERENCES `devis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;