export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'recovered';
export type RecoveryCaseStatus = 'open' | 'in_recovery' | 'recovered' | 'failed_unrecovered' | 'closed';
export type RecoveryPriority = 'low' | 'medium' | 'high' | 'critical';
export type AgentDecisionType = 'retry' | 'send_payment_link' | 'send_reminder' | 'wait' | 'escalate' | 'stop';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  user: User;
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
  total_count: number;
}

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badge_variant: 'success' | 'warning' | 'danger' | 'info' | 'purple';
  type: 'recovery-cases' | 'customers' | 'payments';
  target_id: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  recovery_cases: SearchItem[];
  customers: SearchItem[];
  payments: SearchItem[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  consent_status: boolean;
  risk_score: number;
  created_at: string;
  payments_count?: number;
  failed_count?: number;
  recovered_count?: number;
  total_spend?: number;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_code?: string;
  failure_reason?: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
}

export interface Subscription {
  id: string;
  amount: number;
  billing_cycle: string;
  status: string;
  next_billing_date?: string;
}

export interface AgentDecision {
  id: string;
  recovery_case_id: string;
  decision: AgentDecisionType;
  reasoning: string;
  confidence: number;
  priority: RecoveryPriority;
  created_at: string;
}

export interface RecoveryAction {
  id: string;
  recovery_case_id: string;
  action_type: string;
  status: string;
  scheduled_for?: string;
  executed_at?: string;
  result?: string;
  amount_recovered: number;
}

export interface AuditLog {
  id: string;
  recovery_case_id?: string;
  event_type: string;
  actor: string;
  description: string;
  metadata_json?: string;
  created_at: string;
}

export interface RecoveryCase {
  id: string;
  payment_id: string;
  customer_id: string;
  revenue_at_risk: number;
  status: RecoveryCaseStatus;
  assigned_action?: string;
  priority: RecoveryPriority;
  retry_count: number;
  detected_at: string;
  resolved_at?: string;
  customer_name?: string;
  customer_email?: string;
  failure_reason?: string;
  payment_method?: string;
  latest_decision?: string;
  latest_confidence?: number;
  latest_action_status?: string;
  amount_recovered: number;
}

export interface CustomerPastPaymentsSummary {
  total_count: number;
  successful_count: number;
  failed_count: number;
  total_spend: number;
  success_rate: number;
}

export interface RecoveryCaseDetail extends RecoveryCase {
  customer?: Customer;
  payment?: Payment;
  subscription?: Subscription;
  customer_past_payments_summary?: CustomerPastPaymentsSummary;
  decisions: AgentDecision[];
  actions: RecoveryAction[];
  audit_logs: AuditLog[];
}

export interface GuardrailCheck {
  rule_name: string;
  passed: boolean;
  message: string;
  severity: 'BLOCKING' | 'WARNING' | 'INFO';
}

export interface AnalyzeResponse {
  recovery_case_id: string;
  decision: AgentDecisionType;
  reasoning: string;
  confidence: number;
  priority: RecoveryPriority;
  suggested_action: string;
  guardrails_precheck: {
    passed: boolean;
    summary: string;
    checks: GuardrailCheck[];
  };
}

export interface ExecuteResponse {
  recovery_case_id: string;
  action_type: string;
  guardrail_passed: boolean;
  guardrail_results: GuardrailCheck[];
  action_status: string;
  result_message: string;
  recovered_amount: number;
  audit_log_id?: string;
}

export interface PressureFactor {
  label: string;
  points: number;
  detail: string;
}

export interface RecoveryPressure {
  case_id: string;
  customer_id: string;
  score: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'continue' | 'reduce_frequency' | 'pause' | 'escalate';
  factors: PressureFactor[];
  assessed_at?: string;
}

// Backward compatibility alias
export type FatigueAssessment = RecoveryPressure;
export type FatigueFactor = PressureFactor;

export interface TransactionRiskSignal {
  category: string;
  points: number;
  detail: string;
}

export interface TransactionRisk {
  payment_id: string;
  customer_id: string;
  score: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
  signals: TransactionRiskSignal[];
  explanation: string;
  assessed_at?: string;
}

export interface StrategyEvaluation {
  strategy: string;
  display_name: string;
  suitability_score: number; // 0-100
  recovery_potential: 'low' | 'medium' | 'high';
  customer_impact: 'low' | 'medium' | 'high';
  execution_risk: 'low' | 'medium' | 'high';
  eligible: boolean;
  recommended: boolean;
  reasons: string[];
  blockers: string[];
}

export interface StrategySimulationResponse {
  case_id: string;
  recovery_pressure?: {
    score: number;
    level: string;
    recommendation: string;
  };
  transaction_risk?: {
    score: number;
    level: string;
  };
  fatigue?: {
    score: number;
    level: string;
    recommendation: string;
  };
  strategies: StrategyEvaluation[];
  recommended_strategy?: string;
  simulation_note: string;
}

export interface PipelineStageResult {
  stage_id: string;
  title: string;
  status: 'completed' | 'blocked' | 'failed' | 'running';
  description: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

export interface AgentPipelineResponse {
  recovery_case_id: string;
  decision: AgentDecision;
  guardrail_passed: boolean;
  guardrail_checks: GuardrailCheck[];
  action_type: string;
  action_status: string;
  result_message: string;
  recovered_amount: number;
  case_final_status: string;
  stages: PipelineStageResult[];
  created_at: string;
}

export interface DashboardSummary {
  total_revenue_at_risk: number;
  total_revenue_recovered: number;
  recovery_rate_pct: number;
  open_recovery_cases_count: number;
  total_failed_payments_count: number;
  successful_recoveries_count: number;
  total_payments_count: number;
  total_customers_count: number;
  failure_reasons_breakdown: Array<{
    reason: string;
    count: number;
    amount: number;
  }>;
  recovery_by_method_breakdown: Array<{
    method: string;
    count: number;
    amount: number;
    recovered: number;
  }>;
  recent_agent_decisions: AgentDecision[];
  recent_audit_logs: AuditLog[];
  recovery_fatigue_breakdown?: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
}

export interface GuardrailPolicy {
  policy_number: number;
  name: string;
  type: string;
  description: string;
  severity: 'BLOCKING' | 'WARNING';
  rationale: string;
}

export interface GuardrailsOverviewResponse {
  engine: string;
  version: string;
  mode: string;
  total_policies: number;
  blocking_policies_count: number;
  contextual_policies_count: number;
  policies: GuardrailPolicy[];
  philosophy: string;
}

export interface AnalyticsOverview {
  overview: {
    total_revenue_at_risk: number;
    total_revenue_recovered: number;
    recovery_rate_pct: number;
    open_cases_count: number;
    recovered_cases_count: number;
    unrecovered_cases_count: number;
    total_cases_count: number;
    total_customers_count: number;
    total_guardrail_blocks: number;
  };
  recovery_pressure_distribution: Record<string, number>;
  transaction_risk_distribution: Record<string, number>;
  strategy_performance: Array<{
    strategy: string;
    display_name: string;
    decisions_count: number;
    executed_count: number;
    recovered_amount: number;
  }>;
  failure_reasons: Array<{
    reason: string;
    total_cases: number;
    recovered_cases: number;
    amount_at_risk: number;
    amount_recovered: number;
  }>;
  method_performance: Array<{
    method: string;
    total_volume: number;
    failed_count: number;
    recovered_count: number;
    recovered_volume: number;
  }>;
}

export interface DemoScenario {
  id: string;
  title: string;
  category: string;
  expected_action: string;
  expected_guardrail: string;
  description: string;
}
