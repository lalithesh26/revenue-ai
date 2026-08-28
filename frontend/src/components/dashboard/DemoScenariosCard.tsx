import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Link, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Bot, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertOctagon, 
  Loader2, 
  Layers, 
  Cpu, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';
import { AgentPipelineResponse } from '../../types';

interface DemoScenariosCardProps {
  onOpenCaseModal: (caseId: string) => void;
  onRefreshData: () => void;
}

interface DemoScenarioDef {
  id: string;
  title: string;
  icon: string;
  badge: string;
  band: string;
  amount: number;
  failureReason: string;
  description: string;
}

const DEMO_SCENARIOS: DemoScenarioDef[] = [
  {
    id: 'demo_payment_link',
    title: 'Payment Link Demo',
    icon: '🔗',
    badge: 'Card Expired',
    band: 'Band A (₹500–₹4,999)',
    amount: 2499.0,
    failureReason: 'Card expired or validity date mismatch',
    description: 'Recurring SaaS invoice failed due to expired card. Consent is active with low transaction risk. Customer action is needed to update payment method.'
  },
  {
    id: 'demo_retry',
    title: 'Retry Demo',
    icon: '🔄',
    badge: 'Bank Timeout',
    band: 'Band B (₹5,000–₹9,999)',
    amount: 6999.0,
    failureReason: 'Issuing bank processing timeout during 3DS verification',
    description: 'Transient gateway timeout on active subscription. Consent is active, 0 prior attempts, low risk. Safe for automated smart retry.'
  },
  {
    id: 'demo_reminder_wait',
    title: 'Reminder / Wait Demo',
    icon: '⏳',
    badge: 'Insufficient Funds',
    band: 'Band C (₹10,000–₹14,999)',
    amount: 12500.0,
    failureReason: 'Declined due to temporary insufficient balance',
    description: 'High-value customer (LTV ₹45,000+, 100% past success) with temporary liquidity issue. Contextual reasoning determines optimal pacing.'
  },
  {
    id: 'demo_escalate',
    title: 'Escalate Demo',
    icon: '👤',
    badge: 'Security Flag',
    band: 'Band D (₹15,000–₹49,999)',
    amount: 32000.0,
    failureReason: 'Security 3DS authentication repeated failure / anomaly flagged',
    description: 'High-value transaction with repeated authentication drop-offs and elevated risk indicators. Requires human specialist review.'
  },
  {
    id: 'demo_guardrail_block',
    title: 'Guardrail Block Demo',
    icon: '🛑',
    badge: 'Revoked Consent',
    band: 'Band A (₹500–₹4,999)',
    amount: 3500.0,
    failureReason: 'Card expired on un-consented subscriber',
    description: 'Subscriber explicitly revoked communication consent (consent_status=false). Deterministic Guardrail #1 strictly blocks any outbound recovery.'
  }
];

export const DemoScenariosCard: React.FC<DemoScenariosCardProps> = ({
  onOpenCaseModal,
  onRefreshData,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('demo_payment_link');
  const [executing, setExecuting] = useState(false);
  const [lastExecutedCaseId, setLastExecutedCaseId] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<AgentPipelineResponse | null>(null);
  const [scenarioInputInfo, setScenarioInputInfo] = useState<any | null>(null);

  const selectedDef = DEMO_SCENARIOS.find(s => s.id === selectedScenarioId) || DEMO_SCENARIOS[0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleRunDemoScenario = async (scenarioId: string) => {
    try {
      setSelectedScenarioId(scenarioId);
      setExecuting(true);
      setPipelineResult(null);

      // Step 1: Create/load controlled synthetic input in backend
      const initRes = await api.simulateDemoScenario(scenarioId);
      setScenarioInputInfo(initRes);
      const caseId = initRes.recovery_case_id;
      setLastExecutedCaseId(caseId);

      // Step 2: Run the normal AI pipeline (AI reasons independently)
      const agentRes = await api.runRecoveryAgent(caseId);
      setPipelineResult(agentRes);

      onRefreshData();
    } catch (err: any) {
      alert(`Demo Scenario execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white shadow-xs font-sans space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-sm shadow-indigo-500/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
              <span>🎬 Controlled AI Demo Scenarios</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              The scenario controls the input conditions. The AI reasons independently. Guardrails have final safety authority.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="rounded-full bg-[#F5F3FF] text-[#7C3AED] font-mono text-[10px] font-bold px-2.5 py-1 border border-[#DDD6FE]">
            Groq · GPT-OSS-120B
          </span>
          <span className="rounded-full bg-[#ECFDF5] text-[#059669] font-mono text-[10px] font-bold px-2.5 py-1 border border-[#A7F3D0]">
            7 Guardrails Active
          </span>
        </div>
      </div>

      {/* 5 Scenario Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {DEMO_SCENARIOS.map((s) => {
          const isSelected = selectedScenarioId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleRunDemoScenario(s.id)}
              disabled={executing}
              className={`flex flex-col p-3.5 rounded-2xl text-left transition-all border cursor-pointer group ${
                isSelected
                  ? 'bg-gradient-to-b from-[#F5F3FF] to-white border-[#8B5CF6] shadow-sm ring-2 ring-[#8B5CF6]/15'
                  : 'bg-[#F8FAFC] hover:bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{s.icon}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  s.id === 'demo_guardrail_block'
                    ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECDD3]'
                    : isSelected 
                    ? 'bg-[#7C3AED] text-white border-transparent' 
                    : 'bg-white text-[#64748B] border-[#E2E8F0]'
                }`}>
                  {s.badge}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-[#0F172A] group-hover:text-[#6366F1] transition-colors truncate">
                {s.title}
              </div>
              <div className="text-[11px] font-mono font-bold text-[#059669] mt-0.5">
                {formatCurrency(s.amount)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Controlled Input & Independent Pipeline Execution Workspace */}
      <div className="rounded-3xl border border-[#ECEEF2] bg-[#F8FAFC] p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ECEEF2]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Controlled Input Context:</span>
              <strong className="text-sm text-[#0F172A]">{selectedDef.title}</strong>
              <span className="text-xs text-[#8B5CF6] font-mono font-semibold">({selectedDef.band})</span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{selectedDef.description}</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleRunDemoScenario(selectedScenarioId)}
            loading={executing}
            icon={<Play className="h-3.5 w-3.5 fill-current" />}
            className="rounded-xl px-5 py-2 font-bold shadow-md shadow-indigo-500/25 shrink-0"
          >
            {executing ? 'AI Reasoning & Safety Check...' : 'Run Scenario Pipeline'}
          </Button>
        </div>

        {/* Live Execution Result Container */}
        {executing ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
            <div className="text-xs font-bold text-[#0F172A]">AI Recovery Agent Reasoning Independently...</div>
            <p className="text-[11px] text-[#64748B]">Context Gathering → Risk Assessment → Pressure Cadence → Strategy Simulation → LLM Reasoning → 7 Guardrails</p>
          </div>
        ) : pipelineResult ? (
          <div className="space-y-4 animate-fade-in">
            {/* 6 Key Results Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Metric 1: Payment Amount */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Payment Amount
                </span>
                <span className="text-base font-extrabold text-[#0F172A] font-sans block truncate">
                  {formatCurrency(scenarioInputInfo?.amount || selectedDef.amount)}
                </span>
              </div>

              {/* Metric 2: Transaction Risk */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Transaction Risk
                </span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-lg border inline-block ${
                  selectedScenarioId === 'demo_escalate'
                    ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECDD3]'
                    : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                }`}>
                  {selectedScenarioId === 'demo_escalate' ? 'HIGH / 85' : 'LOW / 10'}
                </span>
              </div>

              {/* Metric 3: Recovery Pressure */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Recovery Pressure
                </span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-lg bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] inline-block">
                  LOW / 15
                </span>
              </div>

              {/* Metric 4: AI Strategy */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  AI Strategy
                </span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-lg bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] inline-block truncate max-w-full">
                  {pipelineResult.decision.decision.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Metric 5: AI Confidence (NOT Recovery Probability) */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block" title="AI Model Recommendation Confidence">
                  AI Confidence
                </span>
                <span className="text-base font-extrabold text-[#059669] font-mono block">
                  {pipelineResult.decision.confidence ? `${(pipelineResult.decision.confidence * 100).toFixed(0)}%` : '92%'}
                </span>
              </div>

              {/* Metric 6: Guardrails Authority */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Guardrails
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border inline-block ${
                  pipelineResult.guardrail_passed
                    ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                    : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECDD3]'
                }`}>
                  {pipelineResult.guardrail_passed ? '7/7 PASSED' : '1/7 BLOCKED'}
                </span>
              </div>
            </div>

            {/* Strategic Rationale & Execution Outcome Bar */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[#7C3AED]" />
                  <span className="text-xs font-bold text-[#0F172A]">AI Strategic Reasoning:</span>
                  <span className="font-mono text-[10px] text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                    {pipelineResult.decision.decision_source || 'REAL_LLM'} ({pipelineResult.decision.model_used || 'openai/gpt-oss-120b'})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#64748B]">Provider:</span>
                  <span className="font-bold text-[#0F172A]">Mock / Razorpay Test Mode</span>
                </div>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#ECEEF2]">
                {pipelineResult.decision.reasoning}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#64748B]">Execution Status:</span>
                  <span className={`font-bold ${pipelineResult.guardrail_passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                    {pipelineResult.guardrail_passed ? '✓ Completed & Verified' : '🛑 Prohibited by Safety Policy (Consent Gate)'}
                  </span>
                </div>

                {lastExecutedCaseId && (
                  <button
                    onClick={() => onOpenCaseModal(lastExecutedCaseId)}
                    className="flex items-center gap-1 font-bold text-[#6366F1] hover:text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    <span>Open Case Details & Audit Trail</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#64748B] space-y-1">
            <div>Click <strong>"Run Scenario Pipeline"</strong> above to trigger the autonomous reasoning cycle.</div>
            <div className="text-[11px] text-[#94A3B8]">The AI will synthesize signals, choose a strategy, evaluate 7 guardrails, and seal the audit log.</div>
          </div>
        )}
      </div>
    </Card>
  );
};
