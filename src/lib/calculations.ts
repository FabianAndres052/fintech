import { Periodicity } from './types';

export interface LoanCalculationInput {
  capital: number;
  interestRate: number; // percentage (e.g., 20 for 20%)
  installmentsCount: number;
  periodicity: Periodicity;
  disbursementDate: string; // YYYY-MM-DD
  firstPaymentDate?: string; // YYYY-MM-DD optional
}

export interface CalculatedInstallment {
  installmentNumber: number;
  dueDate: string;
  capitalShare: number;
  interestShare: number;
  totalAmount: number;
  balanceAfter: number;
}

export interface LoanCalculationResult {
  capital: number;
  interestRate: number; // Tasa mensual (%)
  durationMonths: number;
  monthlyInterest: number;
  interestAmount: number; // Intereses totales pactados
  totalAmount: number; // Capital + Intereses totales
  installmentsCount: number;
  paymentPerInstallment: number;
  periodicity: Periodicity;
  disbursementDate: string;
  startDate: string;
  endDate: string;
  schedule: CalculatedInstallment[];
  isValid: boolean;
  validationError?: string;
}

export interface LoanRuleLimits {
  minCapital?: number;
  maxCapital?: number;
  maxInstallmentsUnder1m?: number;
  maxInstallmentsOver1m?: number;
}

/**
 * Valida las reglas de negocio del préstamo
 */
export function validateLoanRules(
  capital: number,
  installmentsCount: number,
  limits?: LoanRuleLimits
): { isValid: boolean; error?: string } {
  const minCap = limits?.minCapital ?? 100000;
  const maxCap = limits?.maxCapital ?? 10000000;
  const maxUnder1m = limits?.maxInstallmentsUnder1m ?? 20;
  const maxOver1m = limits?.maxInstallmentsOver1m ?? 28;

  if (isNaN(capital) || capital < minCap) {
    return {
      isValid: false,
      error: `El capital mínimo permitido es de $ ${new Intl.NumberFormat('es-CO').format(minCap)} COP.`,
    };
  }
  if (capital > maxCap) {
    return {
      isValid: false,
      error: `El capital máximo permitido es de $ ${new Intl.NumberFormat('es-CO').format(maxCap)} COP.`,
    };
  }
  if (!Number.isInteger(installmentsCount) || installmentsCount <= 0) {
    return { isValid: false, error: 'El número de cuotas debe ser un número entero mayor a 0.' };
  }

  // Regla de cuotas según capital:
  if (capital < 1000000 && installmentsCount > maxUnder1m) {
    return {
      isValid: false,
      error: `Para montos menores a $1.000.000 COP el plazo máximo es de ${maxUnder1m} cuotas.`,
    };
  }
  if (capital >= 1000000 && installmentsCount > maxOver1m) {
    return {
      isValid: false,
      error: `Para montos de $1.000.000 COP o superiores el plazo máximo es de ${maxOver1m} cuotas.`,
    };
  }

  return { isValid: true };
}

/**
 * Agrega intervalo de tiempo según la periodicidad
 */
export function addPeriodToDate(dateStr: string, periodicity: Periodicity, stepCount: number = 1): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (periodicity === 'SEMANAL') {
    date.setDate(date.getDate() + 7 * stepCount);
  } else if (periodicity === 'QUINCENAL') {
    date.setDate(date.getDate() + 15 * stepCount);
  } else if (periodicity === 'MENSUAL') {
    date.setMonth(date.getMonth() + stepCount);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula la duración en meses según periodicidad y número de cuotas:
 * - Semanal: 4 semanas por mes (cuotas / 4)
 * - Quincenal: 2 quincenas por mes (cuotas / 2)
 * - Mensual: 1 mes por cuota (cuotas / 1)
 */
export function calculateDurationMonths(installmentsCount: number, periodicity: Periodicity): number {
  if (periodicity === 'SEMANAL') {
    return Math.round((installmentsCount / 4) * 100) / 100;
  }
  if (periodicity === 'QUINCENAL') {
    return Math.round((installmentsCount / 2) * 100) / 100;
  }
  return installmentsCount;
}

/**
 * Calcula con exactitud financiera el plan de pagos y tabla de amortización
 * utilizando interés simple mensual sobre capital proporcional a la duración.
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const { capital, interestRate, installmentsCount, periodicity, disbursementDate, firstPaymentDate } = input;

  const validation = validateLoanRules(capital, installmentsCount);
  if (!validation.isValid) {
    return {
      capital,
      interestRate,
      durationMonths: 0,
      monthlyInterest: 0,
      interestAmount: 0,
      totalAmount: capital,
      installmentsCount,
      paymentPerInstallment: 0,
      periodicity,
      disbursementDate,
      startDate: disbursementDate,
      endDate: disbursementDate,
      schedule: [],
      isValid: false,
      validationError: validation.error,
    };
  }

  // Duración en meses según periodicidad (ej. 20 semanas / 4 = 5 meses)
  const durationMonths = calculateDurationMonths(installmentsCount, periodicity);

  // Interés mensual = Capital × Tasa mensual (%)
  const monthlyInterest = Math.round((capital * (interestRate / 100)) * 100) / 100;

  // Interés total = Capital × Tasa mensual (%) × Duración en meses
  const interestAmount = Math.round((monthlyInterest * durationMonths) * 100) / 100;

  // Total a pagar = Capital + Intereses totales
  const totalAmount = Math.round((capital + interestAmount) * 100) / 100;

  // Valor de cuota = Total a pagar ÷ Número de cuotas
  const rawPayment = totalAmount / installmentsCount;
  const paymentPerInstallment = Math.round(rawPayment);

  const capitalSharePerInstallment = Math.round((capital / installmentsCount) * 100) / 100;
  const interestSharePerInstallment = Math.round((interestAmount / installmentsCount) * 100) / 100;

  const schedule: CalculatedInstallment[] = [];
  const initialStartDate = firstPaymentDate || addPeriodToDate(disbursementDate, periodicity, 1);
  let remainingTotalBalance = totalAmount;
  let remainingCapital = capital;
  let remainingInterest = interestAmount;

  for (let i = 1; i <= installmentsCount; i++) {
    const dueDate = i === 1 ? initialStartDate : addPeriodToDate(initialStartDate, periodicity, i - 1);
    
    // Ajuste en la última cuota para cuadrar centavos con exactitud absoluta
    let currentPayment = paymentPerInstallment;
    let capShare = capitalSharePerInstallment;
    let intShare = interestSharePerInstallment;

    if (i === installmentsCount) {
      capShare = Math.round(remainingCapital * 100) / 100;
      intShare = Math.round(remainingInterest * 100) / 100;
      currentPayment = Math.round((capShare + intShare) * 100) / 100;
    } else {
      remainingCapital = Math.max(0, Math.round((remainingCapital - capShare) * 100) / 100);
      remainingInterest = Math.max(0, Math.round((remainingInterest - intShare) * 100) / 100);
    }

    remainingTotalBalance = Math.max(0, Math.round((remainingTotalBalance - currentPayment) * 100) / 100);

    schedule.push({
      installmentNumber: i,
      dueDate,
      capitalShare: capShare,
      interestShare: intShare,
      totalAmount: currentPayment,
      balanceAfter: remainingTotalBalance,
    });
  }

  const startDate = schedule[0]?.dueDate || disbursementDate;
  const endDate = schedule[schedule.length - 1]?.dueDate || disbursementDate;

  return {
    capital,
    interestRate,
    durationMonths,
    monthlyInterest,
    interestAmount,
    totalAmount,
    installmentsCount,
    paymentPerInstallment,
    periodicity,
    disbursementDate,
    startDate,
    endDate,
    schedule,
    isValid: true,
  };
}

/**
 * Formateador de moneda colombiana estándar (COP)
 */
export function formatCOP(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '$ 0';
  }
  const numeric = Math.round(Number(amount));
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Formateador de fechas amigable en español
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
    const [year, month, day] = str.substring(0, 10).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Obtiene una etiqueta descriptiva y clara para identificar cada crédito de forma independiente
 */
export function getLoanLabel(loan?: {
  loan_code?: string;
  notes?: string | null;
  installments_count?: number;
  periodicity?: string;
  capital_amount?: number | string;
} | null): string {
  if (!loan) return 'Crédito';
  const notes = loan.notes || '';
  if (notes.includes('Deuda anterior') || notes.includes('congelad') || loan.periodicity === 'LIBRE' || Number(loan.installments_count) === 0) {
    return 'Deuda Congelada (Abonos Libres)';
  }
  if (notes.includes('Crédito nuevo') || notes.includes('nuevo independiente')) {
    return `Crédito Nuevo (${loan.installments_count || 2} cuotas)`;
  }
  if (notes.includes('Crédito histórico 1') || notes.includes('Crédito 1')) {
    return `Crédito 1 (${loan.installments_count || 12} cuotas)`;
  }
  if (notes.includes('Crédito histórico 2') || notes.includes('Crédito 2')) {
    return `Crédito 2 (${loan.installments_count || 28} cuotas)`;
  }
  if (notes.includes('Crédito histórico 3') || notes.includes('Crédito 3')) {
    return `Crédito 3 (${loan.installments_count || 28} cuotas)`;
  }
  if (loan.installments_count && loan.installments_count > 0) {
    return `Crédito (${loan.installments_count} cuotas ${loan.periodicity ? loan.periodicity.toLowerCase() : 'semanal'}es)`;
  }
  return loan.loan_code || 'Crédito';
}
