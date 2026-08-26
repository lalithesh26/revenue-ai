import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  CreditCard, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Bot, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  StopCircle, 
  TrendingUp, 
  Lock, 
  MoreVertical,
  Layers,
  Cpu
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { AgentPipelineStepper } from './AgentPipelineStepper';
import { AuditTimeline } from './AuditTimeline';
import { RecoveryPressureCard } from './RecoveryPressureCard';
import { TransactionRiskCard } from './TransactionRiskCard';
import { StrategySimulatorCard } from './StrategySimulatorCard';
import { 
  RecoveryCaseDetail, 
  GuardrailCheck, 
  PipelineStageResult, 
  RecoveryPressure, 
  TransactionRisk 
} from '../../types';
import { api } from '../../services/api';

interface RecoveryCaseDetailModalProps {
  caseId: string | null;
  onClose: () => void;
  onRefreshParent: () => void;
  onNavigateNextCase?: () => void;
}

export const RecoveryCaseDetailModal: React.FC<RecoveryCaseDetailModalProps> = ({
  caseId,
  onClose,
  onRefreshParent,
  onNavigateNextCase,
}) => {
  const [caseDetail, setCaseDetail] = useState<RecoveryCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState(false);
  const [executingStrategy, setExecutingStrategy] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageResult[]>([]);
  const [activeTab, setActiveTab] = useState<'workspace' | 'audit'>('workspace');
  const [guardrailResults, setGuardrailResults] = useState<GuardrailCheck[]>([]);
  const [guardrailPassed, setGuardrailPassed] = useState(true);
  const [guardrailSummary, setGuardrailSummary] = useState<string>('');
  const [simulatingSettlement, setSimulatingSettlement] = useState(false);
  const [pressure, setPressure] = useState<RecoveryPressure | null>(null);
  const [transactionRisk, setTransactionRisk] = useState<TransactionRisk | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);

  const fetchDetail = async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      setLoadingSignals(true);
      const data = await api.getRecoveryCase(caseId);
      setCaseDetail(data);

      try {
        const [pressureData, riskData] = await Promise.all([
          api.getCasePressure(caseId),
          api.getCaseTransactionRisk(caseId)
        ]);
        setPressure(pressureData);
        setTransactionRisk(riskData);
      } catch (err) {
        console.warn('Could not load pressure or risk assessment', err);
      }
    } catch (err) {
      console.error('Failed to load case detail', err);
    } finally {
      setLoading(false);
      setLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    setPipelineStages([]);
  }, [caseId]);

  if (!caseId) return null;

  const handleRunAgent = async () => {
    if (!caseId) return;
    try {
      setRunningAgent(true);
      const res = await api.runRecoveryAgent(caseId);
      
      setPipelineStages(res.stages);
      setGuardrailResults(res.guardrail_checks);
      setGuardrailPassed(res.guardrail_passed);
      setGuardrailSummary(res.result_message);
      
      await fetchDetail();
      onRefreshParent();
    } catch (err: any) {
      alert(`Autonomous Agent Pipeline failed: ${err.message}`);
    } finally {
      setRunningAgent(false);
    }
  };

  const handleExecuteSelectedStrategy = async (strategy: string) => {
    if (!caseId) return;
    try {
      setExecutingStrategy(true);
      const res = await api.executeRecoveryCase(caseId, strategy);
      if (!res.guardrail_passed) {
        alert(`Guardrail Safety Policy Blocked: ${res.result_message}`);
      } else {
        alert(`Strategy '${strategy.toUpperCase()}' Executed: ${res.result_message}`);
      }
      await fetchDetail();
      onRefreshParent();
    } catch (err: any) {
      alert(`Strategy execution failed: ${err.message}`);
    } finally {
      setExecutingStrategy(false);
    }
  };

  const handleSimulateCustomerRecovery = async () => {
    if (!caseId) return;
    try {
      setSimulatingSettlement(true);
      await api.simulateRecovery(caseId);
      await fetchDetail();
      onRefreshParent();
    } catch (err: any) {
      alert(`Simulate recovery failed: ${err.message}`);
    } finally {
      setSimulatingSettlement(false);
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open': return <Badge variant="warning" dot>OPEN</Badge>;
      case 'in_recovery': return <Badge variant="info" dot>IN RECOVERY</Badge>;
      case 'recovered': return <Badge variant="success" dot>RECOVERED</Badge>;
      case 'failed_unrecovered': return <Badge variant="danger" dot>UNRECOVERED</Badge>;
      case 'closed': return <Badge variant="neutral" dot>CLOSED</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isEscalated = caseDetail?.assigned_action === 'escalate' || (caseDetail?.priority === 'critical' && (caseDetail?.decisions?.length || 0) > 0);
  const isStopped = caseDetail?.assigned_action === 'stop' || caseDetail?.status === 'closed' || caseDetail?.customer?.consent_status === false;
  const isRecovered = caseDetail?.status === 'recovered';

  const defaultGuardrails: GuardrailCheck[] = [
    { rule_name: "Policy 1: Customer Consent Gate", passed: caseDetail?.customer?.consent_status ?? true, message: "Outreach requires active customer consent", severity: "BLOCKING" },
    { rule_name: "Policy 2: Maximum Retry Throttling", passed: (caseDetail?.retry_count ?? 0) < 3, message: "Automated retries capped at <= 3 attempts", severity: "BLOCKING" },
    { rule_name: "Policy 3: Idempotency & Duplicate Gate", passed: caseDetail?.status !== 'recovered', message: "Prevents double charging resolved payments", severity: "BLOCKING" },
    { rule_name: "Policy 4: Amount Integrity Lock", passed: true, message: "Amount locked to exact invoice amount", severity: "BLOCKING" },
    { rule_name: "Policy 5: Stolen & Fraud Ineligibility", passed: !['stolen', 'fraud'].some(w => (caseDetail?.failure_reason || '').toLowerCase().includes(w)), message: "Blocks automated retries on security flags", severity: "BLOCKING" },
    { rule_name: "Policy 6: Payment Method Expiry", passed: !['expired'].some(w => (caseDetail?.failure_reason || '').toLowerCase().includes(w)), message: "Card expired directs to payment link", severity: "BLOCKING" },
    { rule_name: "Policy 7: Recovery Pressure Cadence", passed: true, message: "Contextual safety check to avoid over-contacting", severity: "WARNING" }
  ];

  const activeChecks = guardrailResults.length > 0 ? guardrailResults : defaultGuardrails;
  const latestDecision = caseDetail?.decisions && caseDetail.decisions.length > 0 ? caseDetail.decisions[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-[#ECEEF2] overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#FAFBFD]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white shadow-md shadow-[#6366F1]/20">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#0F172A]">
                  Recovery Case Details
                </h2>
                <span className="font-mono text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-lg border border-[#E2E8F0]">
                  {caseDetail?.id}
                </span>
                {getStatusBadge(caseDetail?.status)}
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Payment: <span className="font-mono text-[#0F172A]">{caseDetail?.payment_id}</span> · Detected: {caseDetail?.detected_at ? new Date(caseDetail.detected_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              <button
                onClick={() => setActiveTab('workspace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'workspace'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Recovery Workspace
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'audit'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Audit Trail ({caseDetail?.audit_logs?.length || 0})
              </button>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-[#F1F5F9] rounded-2xl w-full"></div>
              <div className="grid grid-cols-3 gap-6">
                <div className="h-64 bg-[#F1F5F9] rounded-2xl"></div>
                <div className="h-64 bg-[#F1F5F9] rounded-2xl"></div>
                <div className="h-64 bg-[#F1F5F9] rounded-2xl"></div>
              </div>
            </div>
          ) : !caseDetail ? (
            <div className="p-12 text-center text-[#64748B]">Case details could not be loaded.</div>
          ) : activeTab === 'audit' ? (
            /* AUDIT TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Sealed Audit Log Timeline</h3>
                  <p className="text-xs text-[#64748B]">Cryptographically verifiable trail of every decision, guardrail check, and execution event.</p>
                </div>
                <Badge variant="info">{caseDetail.audit_logs?.length || 0} Events Logged</Badge>
              </div>
              <AuditTimeline logs={caseDetail.audit_logs || []} />
            </div>
          ) : (
            /* RECOVERY WORKSPACE TAB */
            <>
              {/* STATUS NOTICES */}
              {isEscalated ? (
                <div className="p-4 rounded-2xl border border-[#FECDD3] bg-[#FFF1F2] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E11D48] text-white">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#E11D48]">
                        Automated Recovery Scaled to Human Retention Operations
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Elevated risk or retry limit reached. Automated retries halted to protect customer relationship.
                      </p>
                    </div>
                  </div>
                  {onNavigateNextCase && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onNavigateNextCase}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                      className="rounded-xl px-4 font-bold shadow-sm"
                    >
                      Proceed to Next Case →
                    </Button>
                  )}
                </div>
              ) : isStopped ? (
                <div className="p-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D97706] text-white">
                      <StopCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#D97706]">
                        Automated Outreach Halted (Compliance Policy)
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Customer consent is revoked. In strict accordance with anti-spam compliance, automated messaging is halted.
                      </p>
                    </div>
                  </div>
                  {onNavigateNextCase && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onNavigateNextCase}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                      className="rounded-xl px-4 font-bold shadow-sm"
                    >
                      Proceed to Next Case →
                    </Button>
                  )}
                </div>
              ) : isRecovered ? (
                <div className="p-4 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#059669] text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#059669]">
                        Revenue Successfully Recovered ({formatCurrency(caseDetail.revenue_at_risk)})
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Transaction captured and verified via payment gateway.
                      </p>
                    </div>
                  </div>
                  {onNavigateNextCase && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={onNavigateNextCase}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                      className="rounded-xl px-4 font-bold shadow-sm"
                    >
                      Proceed to Next Case →
                    </Button>
                  )}
                </div>
              ) : null}

              {/* TOP RECOVERY AMOUNT HERO BANNER (HIGHEST PRIORITY) */}
              <div className="rounded-3xl border border-[#ECEEF2] bg-gradient-to-r from-[#F8FAFC] via-white to-[#F5F3FF] p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                      <RotateCcw className="h-3.5 w-3.5 text-[#6366F1]" />
                      <span>Recoverable Payment Amount</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight flex items-baseline gap-2 font-sans">
                      <span>{formatCurrency(caseDetail.revenue_at_risk || caseDetail.payment?.amount || 0)}</span>
                      <span className="text-xs font-semibold text-[#64748B] font-mono">INR</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#64748B] pt-0.5">
                      <span>Invoice / Plan: <strong className="text-[#0F172A]">{caseDetail.subscription?.billing_cycle ? `${caseDetail.subscription.billing_cycle.toUpperCase()} Plan` : 'Standard Invoice'}</strong></span>
                      <span>·</span>
                      <span>Customer: <strong className="text-[#0F172A]">{caseDetail.customer?.name || 'Customer'}</strong></span>
                      <span>·</span>
                      <span>Method: <strong className="text-[#0F172A] uppercase">{caseDetail.payment?.payment_method || 'CARD'}</strong></span>
                    </div>
                  </div>

                  {/* Right quick badges / actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-0.5 min-w-[130px]">
                      <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Failure Reason</div>
                      <div className="text-xs font-bold text-[#E11D48] truncate max-w-[180px]" title={caseDetail.payment?.failure_reason || caseDetail.failure_reason || 'Decline'}>
                        {caseDetail.payment?.failure_reason || caseDetail.failure_reason || 'Gateway Decline'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-0.5 min-w-[110px]">
                      <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Priority</div>
                      <div className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${caseDetail.priority === 'critical' ? 'bg-[#E11D48]' : caseDetail.priority === 'high' ? 'bg-[#D97706]' : 'bg-[#6366F1]'}`}></span>
                        <span>{caseDetail.priority || 'MEDIUM'}</span>
                      </div>
                    </div>

                    {caseDetail.status !== 'recovered' && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleRunAgent}
                        loading={runningAgent}
                        icon={<Bot className="h-4 w-4" />}
                        className="rounded-2xl px-5 font-bold shadow-md shadow-indigo-500/20"
                      >
                        {runningAgent ? 'Running AI Agent...' : 'Run Autonomous Agent'}
                      </Button>
                    )}

                    {caseDetail.status !== 'recovered' && (
                      <Button
                        variant="outline"
                        size="md"
                        onClick={handleSimulateCustomerRecovery}
                        loading={simulatingSettlement}
                        icon={<Sparkles className="h-4 w-4 text-[#059669]" />}
                        className="rounded-2xl px-4 font-bold border-[#A7F3D0] text-[#059669] hover:bg-[#ECFDF5]"
                      >
                        {simulatingSettlement ? 'Simulating...' : 'Simulate Settlement'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 CORE DECISION CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1: Customer Context */}
                <Card className="p-5 border-[#ECEEF2] bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
                      <User className="h-4 w-4 text-[#6366F1]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                        Customer Context
                      </h3>
                    </div>

                    <div className="mt-3 space-y-2.5 text-xs">
                      <div>
                        <div className="font-bold text-xs text-[#0F172A] truncate">{caseDetail.customer?.name}</div>
                        <div className="text-[11px] text-[#64748B] truncate">{caseDetail.customer?.email}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Historical LTV:</span>
                          <span className="font-bold text-[#059669]">
                            {formatCurrency(caseDetail.customer_past_payments_summary?.total_spend)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Success Rate:</span>
                          <span className="font-mono font-bold text-[#0F172A]">
                            {caseDetail.customer_past_payments_summary?.success_rate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Retry Count:</span>
                          <span className="font-mono font-bold text-[#0F172A]">
                            {caseDetail.retry_count} / 3 Max
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">Consent Status:</span>
                        <Badge variant={caseDetail.customer?.consent_status ? 'success' : 'danger'}>
                          {caseDetail.customer?.consent_status ? 'Active Consent' : 'Revoked'}
                        </Badge>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E]">
                        <span className="font-bold block">Decline Reason:</span>
                        <span className="line-clamp-2">{caseDetail.payment?.failure_reason || 'Gateway Decline'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                    <span>Method: {caseDetail.payment?.payment_method?.toUpperCase()}</span>
                    <span>Verified Profile</span>
                  </div>
                </Card>

                {/* CARD 2: Current Transaction Risk */}
                <TransactionRiskCard
                  risk={transactionRisk}
                  loading={loadingSignals}
                />

                {/* CARD 3: Recovery Pressure */}
                <RecoveryPressureCard
                  pressure={pressure}
                  loading={loadingSignals}
                />

                {/* CARD 4: AI Strategy Reasoning */}
                <Card className="p-5 border-[#ECEEF2] bg-white flex flex-col justify-between relative overflow-hidden">
                  <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-[#8B5CF6]/10 to-[#6366F1]/10 blur-2xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-[#7C3AED]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                          AI Strategy
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                        GROQ LLM
                      </span>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#64748B]">Strategy:</span>
                          <span className="font-mono text-xs font-extrabold uppercase px-2 py-0.5 rounded-lg bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                            {(latestDecision?.decision || caseDetail.assigned_action || 'Pending').replace(/_/g, ' ')}
                          </span>
                        </div>

                        {latestDecision?.confidence && (
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[#64748B]">Confidence:</span>
                            <span className="font-mono font-bold text-[#059669]">
                              {(latestDecision.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Strategic Rationale
                        </span>
                        <p className="text-[11px] text-[#334155] leading-snug p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] line-clamp-3">
                          {latestDecision?.reasoning || "Synthesizing transaction risk, pressure cadence, failure reason, and customer LTV to choose optimal recovery action."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="relative z-10 pt-3 border-t border-[#F1F5F9] space-y-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunAgent}
                      loading={runningAgent}
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      className="w-full rounded-xl py-2 text-xs font-bold shadow-md cursor-pointer"
                    >
                      🤖 Run AI Agent
                    </Button>
                    <p className="text-[9px] text-center text-[#94A3B8]">
                      Autonomous Cycle & Audit Sealed
                    </p>
                  </div>
                </Card>
              </div>

              {/* STRATEGY SIMULATOR CARD */}
              <StrategySimulatorCard
                caseId={caseDetail.id}
                onExecuteStrategy={handleExecuteSelectedStrategy}
                executing={executingStrategy}
              />

              {/* SAFETY BOUNDARY COMPLIANCE (7 GUARDRAIL POLICIES) */}
              <Card className="p-5 border-[#ECEEF2] bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Deterministic Safety Guardrails (7 Policies)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                    {activeChecks.filter(c => c.passed).length} / {activeChecks.length} PASSED
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {activeChecks.map((chk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-start justify-between text-xs gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#0F172A] text-[11px] block truncate max-w-[150px]" title={chk.rule_name}>
                            {chk.rule_name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            chk.severity === 'BLOCKING' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}>
                            {chk.severity}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B] leading-tight line-clamp-1" title={chk.message}>
                          {chk.message}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold shrink-0 ${chk.passed ? 'text-[#059669]' : 'text-[#E11D48]'}`}>
                        {chk.passed ? '✓ PASS' : '✗ BLOCK'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 mt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#8C98A4]">
                  <span>Policies 1-6 are Authoritative Hard Blockers · Policy 7 is Contextual Safety</span>
                  <span>Deterministic safety overrides AI recommendations unconditionally</span>
                </div>
              </Card>

              {/* LIVE MULTI-STAGE STEPPER */}
              {(runningAgent || pipelineStages.length > 0) && (
                <AgentPipelineStepper
                  stages={pipelineStages}
                  isRunning={runningAgent}
                />
              )}

              {/* SIMULATE PAYMENT SETTLEMENT */}
              {caseDetail.status === 'in_recovery' && (
                <div className="p-4 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#059669]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Simulate Customer Payment Settlement</span>
                    </div>
                    <p className="text-[11px] text-[#475569]">
                      Simulates customer paying through the recovery payment link or retrying payment successfully.
                    </p>
                  </div>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSimulateCustomerRecovery}
                    loading={simulatingSettlement}
                    icon={<Zap className="h-3.5 w-3.5" />}
                    className="rounded-xl font-bold px-4"
                  >
                    Simulate Settlement (₹{caseDetail.revenue_at_risk})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
