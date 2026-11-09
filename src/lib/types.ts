export type Role = 'SUPERADMIN' | 'ADMIN';
export type ClientStatus = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export type LoanStatus = 'ACTIVO' | 'COMPLETADO' | 'EN_MORA' | 'CANCELADO';
export type InstallmentStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
export type Periodicity = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'LIBRE';
export type MovementType = 
  | 'INGRESO' 
  | 'GASTO' 
  | 'APORTE_CAPITAL' 
  | 'RETIRO_CAPITAL' 
  | 'DESEMBOLSO_PRESTAMO' 
  | 'COBRO_CUOTA';

export interface Administrator {
  id: number;
  name: string;
  username?: string;
  email: string;
  role: Role;
  is_active: number;
  last_login?: string;
  created_at: string;
}

export interface Client {
  id: number;
  document_type?: 'CC' | 'CE' | 'NIT' | 'PASAPORTE' | string | null;
  document_number?: string | null;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  occupation?: string | null;
  monthly_income?: number;
  notes?: string | null;
  status: ClientStatus;
  portal_access?: number;
  last_login?: string | null;
  payout_bank?: string | null;
  payout_key_type?: string | null;
  payout_key_value?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  active_loans_count?: number;
  total_borrowed?: number;
  current_balance?: number;
}

export interface Loan {
  id: number;
  loan_code: string;
  client_id: number;
  client_name?: string;
  client_document?: string;
  client_phone?: string;
  capital_amount: number;
  interest_rate: number;
  interest_amount: number;
  total_amount: number;
  balance_remaining: number;
  capital_collected: number;
  interest_collected: number;
  installments_count: number;
  periodicity: Periodicity;
  payment_per_installment: number;
  disbursement_date: string;
  start_date: string;
  end_date: string;
  status: LoanStatus;
  notes?: string | null;
  created_by?: number;
  created_at: string;
  updated_at: string;
  installments?: Installment[];
}

export interface Installment {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  capital_share: number;
  interest_share: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  capital_paid: number;
  interest_paid: number;
  status: InstallmentStatus;
  paid_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  payment_code: string;
  loan_id: number;
  client_id: number;
  client_name?: string;
  client_document?: string;
  loan_code?: string;
  installment_id?: number | null;
  installment_number?: number | null;
  amount_paid: number;
  capital_paid: number;
  interest_paid: number;
  payment_method: string;
  payment_date: string;
  notes?: string | null;
  receipt_url?: string | null;
  created_by?: number;
  created_at: string;
}

export interface FinancialMovement {
  id: number;
  movement_code: string;
  type: MovementType;
  category: string;
  amount: number;
  capital_component: number;
  interest_component: number;
  payment_method: string;
  balance_after: number;
  description: string;
  reference_id?: string | null;
  created_by?: number;
  created_at: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  payment_method: string;
  description: string;
  expense_date: string;
  created_by?: number;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  is_active: number;
}

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  available_cash: number;           // Dinero real disponible en caja
  active_portfolio: number;         // Cartera activa (capital prestado pendiente por cobrar)
  total_interest_pending: number;   // Intereses por cobrar futuros
  total_payments_received: number;  // Total dinero ingresado por pagos
  capital_recovered: number;        // Capital recuperado histórico
  interest_collected: number;       // Intereses cobrados (ganancia real neta realizada)
  total_clients: number;            // Total clientes registrados
  active_loans_count: number;       // Préstamos vigentes
  overdue_loans_count: number;      // Préstamos en mora
  completed_loans_count: number;    // Préstamos liquidados al 100%
  recent_movements: FinancialMovement[];
  upcoming_installments: (Installment & { client_name: string; client_phone: string; loan_code: string })[];
  overdue_installments: (Installment & { client_name: string; client_phone: string; loan_code: string })[];
}

export type LoanApplicationStatus =
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CONDICIONES_ACEPTADAS'
  | 'DESEMBOLSADO'
  | 'CANCELADO';

export interface LoanApplication {
  id: number;
  application_code: string;
  client_id: number;
  client_name?: string;
  client_phone?: string;
  client_document?: string;
  requested_amount: number;
  requested_installments: number;
  requested_periodicity: Periodicity;
  reason?: string | null;
  status: LoanApplicationStatus;
  approved_capital?: number | null;
  approved_interest_rate?: number | null;
  approved_interest_amount?: number | null;
  approved_total_amount?: number | null;
  approved_installments?: number | null;
  approved_periodicity?: string | null;
  approved_payment_per_installment?: number | null;
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  client_accepted_at?: string | null;
  disbursement_method?: 'TRANSFERENCIA' | 'EFECTIVO' | null;
  disbursement_bank?: string | null;
  disbursement_key_type?: string | null;
  disbursement_key_value?: string | null;
  disbursement_reference?: string | null;
  disbursement_notes?: string | null;
  disbursed_by?: number | null;
  disbursed_at?: string | null;
  loan_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationMessage {
  id: number;
  application_id?: number | null;
  client_id: number;
  sender_type: 'CLIENT' | 'ADMIN';
  sender_id: number;
  sender_name: string;
  message: string;
  attachment_url?: string | null;
  is_read: number;
  created_at: string;
}

export interface PortalNotification {
  id: number;
  client_id: number;
  title: string;
  message: string;
  type: 'PAYMENT' | 'DUE_DATE' | 'LOAN_STATUS' | 'DISBURSEMENT' | 'MESSAGE' | 'SYSTEM';
  reference_id?: string | null;
  reference_type?: string | null;
  is_read: number;
  created_at: string;
}

export interface BoldPayment {
  id: number;
  order_id: string;
  client_id: number;
  loan_id: number;
  installment_id?: number | null;
  amount: number;
  payment_type: 'CUOTA' | 'ABONO';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  bold_tx_id?: string | null;
  payment_method_type?: string | null;
  payload_json?: any;
  created_at: string;
  updated_at: string;
}
