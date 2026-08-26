import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  Bot, 
  CreditCard, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { GuardrailsOverviewResponse, GuardrailPolicy } from '../../types';
import { api } from '../../services/api';

export const GuardrailsOverview: React.FC = () => {
  const [data, setData] = useState<GuardrailsOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGuardrails = async () => {
    try {
      setLoading(true);
      const res = await api.getGuardrails();
      setData(res);
    } catch (err) {
      console.error('Failed to load guardrails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardrails();
  }, []);

  const defaultPolicies: GuardrailPolicy[] = [
    {
      policy_number: 1,
      name: "Customer Communication Consent Gate",
      type: "COMPLIANCE & PRIVACY",
      description: "Verifies active customer communication consent before any payment link, reminder, or notification is scheduled.",
      severity: "BLOCKING",
      rationale: "Data privacy regulations strictly prohibit automated outreach to opted-out customers."
    },
    {
      policy_number: 2,
      name: "Maximum Automated Retry Limit Throttling",
      type: "NETWORK THROTTLING",
      description: "Caps automated gateway retry debits to maximum 3 attempts per invoice lifecycle.",
      severity: "BLOCKING",
      rationale: "Card networks penalize excessive retry velocity; repeated retries harm customer trust."
    },
    {
      policy_number: 3,
      name: "Idempotency & Duplicate Settlement Prevention",
      type: "DOUBLE CHARGE PREVENTION",
      description: "Ensures recovered or settled cases cannot be re-charged.",
      severity: "BLOCKING",
      rationale: "Prevents duplicate debits and billing reconciliation errors."
    },
    {
      policy_number: 4,
      name: "Payment Amount Immutability Lock",
      type: "TRANSACTION INTEGRITY",
      description: "Ensures requested debit matches original invoice amount exactly.",
      severity: "BLOCKING",
      rationale: "Zero hallucination guarantee against arbitrary fee modifications."
    },
    {
      policy_number: 5,
      name: "Fraud & Stolen Card Ineligibility",
      type: "RISK & SECURITY",
      description: "Blocks automated retries on stolen card, lost card, or security decline codes.",
      severity: "BLOCKING",
      rationale: "Stolen or fraudulent card tokens must never be automatically retried."
    },
    {
      policy_number: 6,
      name: "Payment Method Expiry Routing",
      type: "ROUTING SAFETY",
      description: "Expired payment methods redirect to hosted payment link rather than failing retries.",
      severity: "BLOCKING",
      rationale: "Retrying expired cards produces gateway rejections."
    },
    {
      policy_number: 7,
      name: "Recovery Pressure Contextual Safety Check",
      type: "EXPERIENCE PROTECTION",
      description: "Monitors recovery attempt density and communication cadence. Emits warning to pace outreach.",
      severity: "WARNING",
      rationale: "Prevents customer fatigue while allowing legitimate retries to proceed if safety rules pass."
    }
  ];

  const policies = data?.policies || defaultPolicies;

  return (
    <div className="space-y-6 font-sans">
      {/* Hero Architecture Header */}
      <Card className="p-7 border-[#ECEEF2] bg-white relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#8B5CF6]/10 to-[#6366F1]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-[#0F172A]">
                Deterministic Safety Boundary Architecture
              </h2>
              <span className="rounded-full bg-[#ECFDF5] text-[#059669] text-[10px] font-bold px-2.5 py-0.5 border border-[#A7F3D0]">
                Authoritative Gate
              </span>
            </div>
            <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
              RevenueAI uses AI to recommend what to do, but <strong>deterministic safety systems decide whether the action is allowed</strong>. 
              Policies 1–6 are authoritative hard blockers; Policy 7 is a contextual safety cadence check.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#ECEEF2] bg-[#F8FAFC] p-3 text-center">
              <div className="text-xl font-extrabold text-[#991B1B] font-mono">6</div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase">Hard Blockers</div>
            </div>
            <div className="rounded-2xl border border-[#ECEEF2] bg-[#F8FAFC] p-3 text-center">
              <div className="text-xl font-extrabold text-[#D97706] font-mono">1</div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase">Contextual Safety</div>
            </div>
          </div>
        </div>

        {/* Visual Pipeline Flow Diagram */}
        <div className="relative z-10 mt-6 pt-5 border-t border-[#F1F5F9]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">Step 01</span>
                <h4 className="text-xs font-bold text-[#0F172A]">AI Decision Formulation</h4>
                <p className="text-[11px] text-[#64748B]">Synthesizes risk, pressure, LTV (Groq LLM)</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#059669] shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Step 02</span>
                <h4 className="text-xs font-bold text-[#0F172A]">Deterministic Safety Gate</h4>
                <p className="text-[11px] text-[#059669] font-semibold">7 Authoritative Safety Policies</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Step 03</span>
                <h4 className="text-xs font-bold text-[#0F172A]">Execution & Audit Sealing</h4>
                <p className="text-[11px] text-[#64748B]">Isolated gateway capture & immutable logs</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p, idx) => {
          const isBlocking = p.severity === 'BLOCKING';
          return (
            <Card key={idx} className="p-5 border-[#ECEEF2] bg-white flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-2.5 py-0.5 rounded-full border border-[#DDD6FE]">
                    {p.type}
                  </span>
                  <Badge variant={isBlocking ? 'danger' : 'warning'} size="sm">
                    {isBlocking ? 'HARD BLOCKER' : 'CONTEXTUAL SAFETY'}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-[#0F172A]">
                  Policy {p.policy_number}: {p.name}
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-1 text-[11px]">
                <div className="text-[#64748B]">
                  <strong className="text-[#0F172A]">Regulatory / Safety Rationale:</strong> {p.rationale}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
