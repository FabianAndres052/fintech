-- =============================================================================
-- SISTEMA DE ADMINISTRACIÓN DE PRÉSTAMOS FINANCIEROS (FINTECH PRIVADA)
-- ESQUEMA COMPLETO Y NORMALIZADO PARA MYSQL WORKBENCH & PRODUCCIÓN
-- Moneda: Peso Colombiano (COP)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `prestamos_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `prestamos_db`;

-- Desactivar temporalmente revisión de claves foráneas para recreación segura
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `financial_movements`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `installments`;
DROP TABLE IF EXISTS `loans`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `payment_methods`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `administrators`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. ADMINISTRADORES (Acceso exclusivo administrativo)
-- -----------------------------------------------------------------------------
CREATE TABLE `administrators` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(100) NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('SUPERADMIN', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_email` (`email`),
  INDEX `idx_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. CLIENTES (Titulares de préstamos)
-- -----------------------------------------------------------------------------
CREATE TABLE `clients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_type` ENUM('CC', 'CE', 'NIT', 'PASAPORTE') NULL DEFAULT 'CC',
  `document_number` VARCHAR(30) NULL UNIQUE,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NULL DEFAULT '',
  `phone` VARCHAR(25) NULL DEFAULT '',
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NULL DEFAULT '',
  `city` VARCHAR(100) DEFAULT 'Colombia',
  `occupation` VARCHAR(100) NULL,
  `monthly_income` DECIMAL(14, 2) DEFAULT 0.00,
  `notes` TEXT NULL,
  `status` ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_client_doc` (`document_number`),
  INDEX `idx_client_name` (`first_name`, `last_name`),
  INDEX `idx_client_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PRÉSTAMOS (Contratos de crédito financiero)
-- -----------------------------------------------------------------------------
CREATE TABLE `loans` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `loan_code` VARCHAR(20) NOT NULL UNIQUE,
  `client_id` INT UNSIGNED NOT NULL,
  `capital_amount` DECIMAL(14, 2) NOT NULL,           -- Monto desembolsado ($100.000 a $10.000.000)
  `interest_rate` DECIMAL(5, 2) NOT NULL,             -- % Tasa de interés total pactada (ej. 20.00%)
  `interest_amount` DECIMAL(14, 2) NOT NULL,          -- Ganancia total esperada por intereses
  `total_amount` DECIMAL(14, 2) NOT NULL,             -- Capital + Interés total pactado
  `balance_remaining` DECIMAL(14, 2) NOT NULL,        -- Saldo pendiente global por cobrar
  `capital_collected` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,   -- Capital real retornado
  `interest_collected` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,  -- Interés real cobrado (ganancia realizada)
  `installments_count` INT UNSIGNED NOT NULL DEFAULT 0, -- Número de cuotas (0 si es deuda libre/congelada)
  `periodicity` ENUM('SEMANAL', 'QUINCENAL', 'MENSUAL', 'LIBRE') NOT NULL DEFAULT 'SEMANAL',
  `payment_per_installment` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,  -- Valor de la cuota periódica (0 si es libre)
  `disbursement_date` DATE NOT NULL,                  -- Fecha de desembolso
  `start_date` DATE NOT NULL,                         -- Fecha de primera cuota
  `end_date` DATE NOT NULL,                           -- Fecha prevista de culminación
  `status` ENUM('ACTIVO', 'COMPLETADO', 'EN_MORA', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  `notes` TEXT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_loan_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
  INDEX `idx_loan_status` (`status`),
  INDEX `idx_loan_client` (`client_id`),
  INDEX `idx_loan_dates` (`disbursement_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. CUOTAS (Tabla de Amortización / Cronograma de Pagos)
-- -----------------------------------------------------------------------------
CREATE TABLE `installments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `loan_id` INT UNSIGNED NOT NULL,
  `installment_number` INT UNSIGNED NOT NULL,
  `due_date` DATE NOT NULL,
  `capital_share` DECIMAL(14, 2) NOT NULL,            -- Parte correspondiente a amortización de capital
  `interest_share` DECIMAL(14, 2) NOT NULL,           -- Parte correspondiente a interés pactado
  `total_amount` DECIMAL(14, 2) NOT NULL,             -- Valor total programado de la cuota
  `paid_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00, -- Monto total abonado a esta cuota
  `balance` DECIMAL(14, 2) NOT NULL,                  -- Saldo restante por pagar de esta cuota
  `capital_paid` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `interest_paid` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
  `paid_date` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_installment_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_loan_installment` (`loan_id`, `installment_number`),
  INDEX `idx_installment_due` (`due_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. MÉTODOS DE PAGO (Efectivo, Nequi, Daviplata, Transferencia, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE `payment_methods` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(80) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. PAGOS (Registro granular de recaudos)
-- -----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `payment_code` VARCHAR(25) NOT NULL UNIQUE,
  `loan_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `installment_id` INT UNSIGNED NULL,                 -- Puede ser NULL si es abono global/anticipado
  `amount_paid` DECIMAL(14, 2) NOT NULL,              -- Valor total entregado por el cliente
  `capital_paid` DECIMAL(14, 2) NOT NULL,             -- Distribución real a capital
  `interest_paid` DECIMAL(14, 2) NOT NULL,            -- Distribución real a intereses (ganancia)
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'EFECTIVO',
  `payment_date` DATETIME NOT NULL,
  `notes` VARCHAR(255) NULL,
  `receipt_url` VARCHAR(255) NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payment_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_installment` FOREIGN KEY (`installment_id`) REFERENCES `installments` (`id`) ON DELETE SET NULL,
  INDEX `idx_payment_date` (`payment_date`),
  INDEX `idx_payment_loan` (`loan_id`),
  INDEX `idx_payment_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. MOVIMIENTOS FINANCIEROS (Libro mayor de Caja / Flujo de Efectivo)
-- -----------------------------------------------------------------------------
CREATE TABLE `financial_movements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `movement_code` VARCHAR(25) NOT NULL UNIQUE,
  `type` ENUM('INGRESO', 'GASTO', 'APORTE_CAPITAL', 'RETIRO_CAPITAL', 'DESEMBOLSO_PRESTAMO', 'COBRO_CUOTA') NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,                   -- Monto positivo del movimiento
  `capital_component` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,  -- Separación estricta de capital
  `interest_component` DECIMAL(14, 2) NOT NULL DEFAULT 0.00, -- Separación estricta de intereses ganados
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'EFECTIVO',
  `balance_after` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,       -- Saldo en caja tras el movimiento
  `description` VARCHAR(255) NOT NULL,
  `reference_id` VARCHAR(50) NULL,                    -- ID o Código de préstamo/pago/gasto vinculado
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_movement_type` (`type`),
  INDEX `idx_movement_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. GASTOS (Gastos operativos de la actividad crediticia)
-- -----------------------------------------------------------------------------
CREATE TABLE `expenses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(80) NOT NULL,                    -- Papelería, Transporte, Legal, Tecnología, etc.
  `amount` DECIMAL(14, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'EFECTIVO',
  `description` TEXT NOT NULL,
  `expense_date` DATE NOT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_expense_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. CONFIGURACIÓN DEL SISTEMA (Parámetros y Reglas de Negocio)
-- -----------------------------------------------------------------------------
CREATE TABLE `system_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. AUDITORÍA DE OPERACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `action` VARCHAR(60) NOT NULL,                      -- LOGIN, CREAR_PRESTAMO, REGISTRAR_PAGO, etc.
  `entity` VARCHAR(50) NOT NULL,                      -- loans, payments, clients, settings
  `entity_id` VARCHAR(50) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- INSERCIÓN DE DATOS INICIALES (VALORES POR DEFECTO DEL SISTEMA)
-- =============================================================================

-- NOTA DE SEGURIDAD:
-- Los usuarios administradores NO deben incluirse con contraseñas ni hashes en scripts públicos.
-- La creación inicial de administradores se realiza mediante inicialización segura en backend
-- con contraseñas provistas por variables de entorno y encriptadas con bcrypt (factor 12).

-- Métodos de pago estándar
INSERT INTO `payment_methods` (`code`, `name`, `is_active`) VALUES
('EFECTIVO', 'Efectivo', 1),
('NEQUI', 'Nequi', 1),
('DAVIPLATA', 'DaviPlata', 1),
('BANCOLOMBIA', 'Bancolombia (Transferencia / QR)', 1),
('OTRO_BANCO', 'Otros Bancos (PSE / Transferencia)', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Configuración predeterminada según reglas de negocio
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('currency_symbol', 'COP', 'Moneda principal del sistema'),
('min_capital_amount', '100000', 'Monto mínimo de préstamo permitido ($100.000 COP)'),
('max_capital_amount', '10000000', 'Monto máximo de préstamo permitido ($10.000.000 COP)'),
('default_interest_rate', '10.0', 'Tasa de interés predeterminada mensual (%)'),
('max_installments_under_1m', '20', 'Máximo de cuotas para préstamos menores a $1.000.000 COP'),
('max_installments_over_1m', '28', 'Máximo de cuotas para préstamos de $1.000.000 COP o superiores'),
('default_periodicity', 'SEMANAL', 'Periodicidad predeterminada (SEMANAL, QUINCENAL, MENSUAL)'),
('company_name', 'FINTECH', 'Nombre comercial de la entidad prestamista'),
('company_nit', '900.000.000-0', 'NIT o Identificación tributaria'),
('company_phone', '+57 300 000 0000', 'Teléfono de contacto administrativo'),
('company_email', 'contacto@fintech.com', 'Correo de contacto institucional'),
('current_cash_balance', '0.00', 'Capital total disponible en caja inicial')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
