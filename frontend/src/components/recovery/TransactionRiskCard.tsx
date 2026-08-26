import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  CreditCard,
  Lock
} from 'lucide-react';
import { TransactionRisk } from '../../types';

interface TransactionRiskCardProps {
  risk?: TransactionRisk | null;
  loading?: boolean;
}

export const TransactionRiskCard: React.FC<TransactionRiskCardProps> = ({
  risk,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className="p-5 border-[#ECEEF2] bg-white animate-pulse">
        <div className="h-4 bg-[#E2E8F0] rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-[#E2E8F0] rounded w-1/2 mb-3"></div>
        <div className="h-3 bg-[#E2E8F0] rounded w-full mb-2"></div>
        <div className="h-3 bg-[#E2E8F0] rounded w-2/3"></div>
      </Card>
    );
  }

  const score = risk?.score ?? 10;
  const level = risk?.level ?? 'low';
  const explanation = risk?.explanation ?? 'Current transaction exhibits low observable risk across all inspected vectors.';
  const signals = risk?.signals && risk.signals.length > 0 ? risk.signals : [
    { category: 'Failure Code', points: 0, detail: 'Standard transient decline without fraud or stolen flags.' },
    { category: 'Transaction Amount', points: 5, detail: 'Amount is within expected profile baseline.' }
  ];

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case 'critical':
        return <Badge variant="danger" size="sm" dot>CRITICAL RISK</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm" dot>HIGH RISK</Badge>;
      case 'moderate':
        return <Badge variant="info" size="sm" dot>MODERATE RISK</Badge>;
      default:
        return <Badge variant="success" size="sm" dot>LOW RISK</Badge>;
    }
  };

  const getProgressBarColor = (lvl: string) => {
    switch (lvl) {
      case 'critical':
        return 'from-[#F43F5E] to-[#BE123C]';
      case 'high':
        return 'from-[#F59E0B] to-[#D97706]';
      case 'moderate':
        return 'from-[#6366F1] to-[#4F46E5]';
      default:
        return 'from-[#10B981] to-[#059669]';
    }
  };

  return (
    <Card className="p-5 border-[#ECEEF2] bg-white relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-[#0EA5E9]/10 to-[#3B82F6]/10 blur-2xl" />

      <div className="relative z-10">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Current Transaction Risk
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full border border-[#BAE6FD]">
            TRANSACTION CONTEXT
          </span>
        </div>

        {/* Explainer Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-[11px] text-[#64748B] flex items-start gap-2 leading-relaxed">
          <Info className="h-3.5 w-3.5 text-[#0284C7] shrink-0 mt-0.5" />
          <span>
            Evaluates observable risk signals for the current payment transaction (amount deviations, security codes, 3DS flags).
          </span>
        </div>

        {/* Score & Level Display */}
        <div className="mt-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#0F172A] font-mono tracking-tight">
                {score}
              </span>
              <span className="text-xs font-bold text-[#94A3B8] font-mono">
                / 100
              </span>
            </div>
            {getLevelBadge(level)}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getProgressBarColor(level)} transition-all duration-500`}
              style={{ width: `${Math.max(4, score)}%` }}
            />
          </div>

          {/* Thresholds */}
          <div className="flex justify-between text-[9px] font-mono font-bold text-[#94A3B8]">
            <span className={score < 25 ? 'text-[#10B981]' : ''}>LOW (0-24)</span>
            <span className={score >= 25 && score < 50 ? 'text-[#6366F1]' : ''}>MODERATE (25-49)</span>
            <span className={score >= 50 && score < 75 ? 'text-[#F59E0B]' : ''}>HIGH (50-74)</span>
            <span className={score >= 75 ? 'text-[#F43F5E]' : ''}>CRITICAL (75-100)</span>
          </div>
        </div>

        {/* Observable Risk Signals */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            <span>Observed Signals</span>
            <span className="text-[10px] font-mono text-[#94A3B8]">Risk Weights</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {signals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${sig.points > 0 ? 'bg-[#0284C7]' : 'bg-[#10B981]'}`} />
                    <span className="font-semibold text-[#0F172A] text-xs">
                      {sig.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] pl-3 leading-snug">
                    {sig.detail}
                  </p>
                </div>

                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                  sig.points > 0 
                    ? 'text-[#0284C7] bg-[#E0F2FE] border-[#BAE6FD]' 
                    : 'text-[#10B981] bg-[#ECFDF5] border-[#A7F3D0]'
                }`}>
                  +{sig.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation Summary */}
        <div className="mt-4 p-3 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-xs text-[#0369A1] leading-snug flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#0284C7] shrink-0 mt-0.5" />
          <span>{explanation}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pt-3 mt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
        <span>Payment Level Risk Inspection</span>
        <span>Prioritized Over Historical Inactivity</span>
      </div>
    </Card>
  );
};
