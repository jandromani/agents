import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PlanType = 'free' | 'premium_basic' | 'premium_ultra';
export type AgentStatus = 'active' | 'inactive' | 'deploying' | 'error';
export type TransactionType = 'purchase' | 'usage' | 'refund';
export type NotificationType = 'credit_low' | 'agent_inactive' | 'system';

export type RoleType =
  | 'admin'
  | 'manager'
  | 'analyst'
  | 'user'
  | 'viewer'
  | 'superadmin'
  | 'soporte'
  | 'finanzas'
  | 'moderador';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  plan_type: PlanType;
  credits: number;
  role?: RoleType;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model: string;
  knowledge_base: Record<string, any>;
  documents: any[];
  config: Record<string, any>;
  worker_url?: string;
  status: AgentStatus;
  daily_query_count: number;
  last_query_date?: string;
  total_queries: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  agent_id: string;
  user_id: string;
  query_text?: string;
  response_text?: string;
  tokens_used: number;
  credits_consumed: number;
  model_used: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  balance_after: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role?: RoleType;
  entity: string;
  severity?: 'info' | 'warning' | 'critical';
  created_at: string;
  metadata?: Record<string, any>;
}

export interface StripePayment {
  id: string;
  customer_email: string;
  amount: number;
  currency?: string;
  status: string;
  description?: string;
  invoice_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const PLAN_LIMITS = {
  free: {
    maxAgents: 1,
    dailyQueries: 5,
    models: ['gpt-3.5-turbo', 'claude-instant-1'],
  },
  premium_basic: {
    maxAgents: 3,
    dailyQueries: Infinity,
    models: ['gpt-3.5-turbo', 'gpt-4', 'claude-2', 'claude-instant-1'],
  },
  premium_ultra: {
    maxAgents: 10,
    dailyQueries: Infinity,
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-2', 'claude-3-opus'],
    creditBased: true,
  },
};

export const MODEL_COSTS = {
  'gpt-3.5-turbo': 0.001,
  'gpt-4': 0.03,
  'gpt-4-turbo': 0.01,
  'claude-instant-1': 0.0008,
  'claude-2': 0.008,
  'claude-3-opus': 0.015,
};
