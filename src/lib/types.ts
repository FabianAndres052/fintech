export type Role = 'SUPERADMIN' | 'ADMIN';
export type ClientStatus = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export type LoanStatus = 'ACTIVO' | 'COMPLETADO' | 'EN_MORA' | 'CANCELADO';
export type InstallmentStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
export type Periodicity = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
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
  document_type: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
  document_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city?: string;
  occupation?: string | null;
  monthly_income?: number;
  notes?: string | null;
  status: ClientStatus;
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
