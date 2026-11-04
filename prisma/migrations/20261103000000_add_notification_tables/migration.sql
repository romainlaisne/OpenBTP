-- CreateTable
CREATE TABLE `notification_types` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `categorie` ENUM('CHANTIER', 'SOUS_TRAITANT', 'DOCUMENT', 'SAV', 'PLANNING', 'RECEPTION', 'METRE', 'COMMANDE', 'ADMINISTRATIF', 'SYSTEME') NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `emailSubject` VARCHAR(191) NULL,
    `emailTemplate` TEXT NULL,
    `inAppTemplate` TEXT NULL,
    `rolesParDefaut` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_types_code_key`(`code`),
    INDEX `notification_types_code_idx`(`code`),
    INDEX `notification_types_categorie_idx`(`categorie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_user_configs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `notificationTypeId` VARCHAR(191) NOT NULL,
    `activeMail` BOOLEAN NOT NULL DEFAULT true,
    `activeInApp` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_user_configs_userId_idx`(`userId`),
    INDEX `notification_user_configs_notificationTypeId_idx`(`notificationTypeId`),
    UNIQUE INDEX `notification_user_configs_userId_notificationTypeId_key`(`userId`, `notificationTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `notificationTypeId` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `lien` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `estLue` BOOLEAN NOT NULL DEFAULT false,
    `dateLue` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `notifications_userId_estLue_idx`(`userId`, `estLue`),
    INDEX `notifications_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `notifications_expiresAt_idx`(`expiresAt`),
    INDEX `notifications_notificationTypeId_idx`(`notificationTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_user_configs` ADD CONSTRAINT `notification_user_configs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_user_configs` ADD CONSTRAINT `notification_user_configs_notificationTypeId_fkey` FOREIGN KEY (`notificationTypeId`) REFERENCES `notification_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_notificationTypeId_fkey` FOREIGN KEY (`notificationTypeId`) REFERENCES `notification_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;