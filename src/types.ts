export interface LedgerEntry {
  id: string;
  customer_name: string;
  service_name: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  follow_up_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractionResult {
  customer_name: string;
  service_name: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  follow_up_date: string;
}

export interface DashboardAnalytics {
  total_customers: number;
  total_jobs: number;
  outstanding_dues: number;
  payments_collected: number;
}

export interface FollowupItem {
  id: string;
  customer_name: string;
  follow_up_date: string;
  due_amount: number;
  service_name: string;
}
