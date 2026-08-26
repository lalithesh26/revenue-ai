import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  ShieldAlert, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { RecoveryPressure } from '../../types';

interface RecoveryPressureCardProps {
  pressure?: RecoveryPressure | null;
  fatigue?: any; // backward compatibility
  loading?: boolean;
}

export const RecoveryPressureCard: React.FC<RecoveryPressureCardProps> = ({
  pressure,
  fatigue,
  loading = false
}) => {
  const data = pressure || fatigue;

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

  const score = data?.score ?? 15;
  const level = data?.level ?? 'low';
  const recommendation = data?.recommendation ?? 'continue';
  const factors = data?.factors && data.factors.length > 0 ? data.factors : [
    { label: 'Initial recovery cycle', points: 10, detail: '1 attempt logged within normal pacing threshold.' },
    { label: 'Healthy cadence interval', points: 5, detail: 'Sufficient cooling window observed between recovery events.' }
  ];

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case 'critical':
        return <Badge variant="danger" size="sm" dot>CRITICAL PRESSURE</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm" dot>HIGH PRESSURE</Badge>;
      case 'moderate':
        return <Badge variant="info" size="sm" dot>MODERATE PRESSURE</Badge>;
      default:
        return <Badge variant="success" size="sm" dot>LOW PRESSURE</Badge>;
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

  const getRecommendationCallout = (rec: string, lvl: string) => {
    switch (rec) {
      case 'pause':
      case 'reduce_frequency':
        return {
          title: 'REDUCE OUTREACH FREQUENCY / PAUSE',
          desc: 'High recovery density detected. Space out communications to protect customer relationship and reduce churn risk.',
          bg: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
          icon: <PauseCircle className="h-4 w-4 text-[#D97706] shrink-0" />
        };
      case 'escalate':
        return {
          title: 'ESCALATE TO RETENTION OPERATIONS',
          desc: 'Multiple recovery attempts logged. Route to customer retention specialist for high-touch intervention.',
          bg: 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]',
          icon: <ShieldAlert className="h-4 w-4 text-[#E11D48] shrink-0" />
        };
      case 'wait':
        return {
          title: 'ACTIVATE 24H COOLING WINDOW',
          desc: 'Moderate outreach cadence detected. Allow cooling-off period before scheduling secondary outreach.',
          bg: 'bg-[#EEF2FF] border-[#C7D2FE] text-[#3730A3]',
          icon: <Clock className="h-4 w-4 text-[#6366F1] shrink-0" />
        };
      default:
        return {
          title: 'PROCEED WITH RECOVERY STRATEGY',
          desc: 'Recovery pressure is low. Safe to execute recommended automated recovery workflow.',
          bg: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]',
          icon: <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
        };
    }
  };

  const recCallout = getRecommendationCallout(recommendation, level);

  return (
    <Card className="p-5 border-[#ECEEF2] bg-white relative overflow-hidden flex flex-col justify-between">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 blur-2xl" />

      <div className="relative z-10">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] border border-[#C7D2FE]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Recovery Pressure
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#6366F1] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#C7D2FE]">
            CADENCE & VELOCITY SIGNAL
          </span>
        </div>

        {/* Explainer Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-[11px] text-[#64748B] flex items-start gap-2 leading-relaxed">
          <Info className="h-3.5 w-3.5 text-[#6366F1] shrink-0 mt-0.5" />
          <span>
            Measures observable recovery attempt density and communication cadence. It is a decision signal to avoid over-contacting, not an emotional measurement.
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

        {/* Observable Contributing Factors */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            <span>Observable Factors</span>
            <span className="text-[10px] font-mono text-[#94A3B8]">Deterministic Weights</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {factors.map((factor: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
                    <span className="font-semibold text-[#0F172A] text-xs">
                      {factor.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] pl-3 leading-snug">
                    {factor.detail}
                  </p>
                </div>

                <span className="font-mono text-xs font-bold text-[#6366F1] bg-[#EEF2FF] px-2 py-0.5 rounded-lg border border-[#C7D2FE] shrink-0">
                  +{factor.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation Callout */}
        <div className="mt-4">
          <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${recCallout.bg}`}>
            {recCallout.icon}
            <div className="space-y-0.5">
              <div className="text-xs font-bold tracking-tight">
                {recCallout.title}
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                {recCallout.desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pt-3 mt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
        <span>Guardrail Policy 7 (Contextual Safety)</span>
        <span>Non-Blocking Pacing Intelligence</span>
      </div>
    </Card>
  );
};

// Export alias for backward compatibility
export const RecoveryFatigueCard = RecoveryPressureCard;
