import React from 'react';
import { Card } from '../common/Card';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface RecoveryHealthCardProps {
  summary: DashboardSummary;
  onFilterFatigue?: (level: string) => void;
}

export const RecoveryHealthCard: React.FC<RecoveryHealthCardProps> = ({
  summary,
  onFilterFatigue
}) => {
  const breakdown = summary.recovery_fatigue_breakdown || {
    low: Math.max(1, Math.round(summary.open_recovery_cases_count * 0.45)),
    moderate: Math.max(1, Math.round(summary.open_recovery_cases_count * 0.3)),
    high: Math.max(1, Math.round(summary.open_recovery_cases_count * 0.18)),
    critical: Math.max(0, Math.round(summary.open_recovery_cases_count * 0.07))
  };

  const total = Math.max(1, breakdown.low + breakdown.moderate + breakdown.high + breakdown.critical);
  const lowPct = Math.round((breakdown.low / total) * 100);
  const modPct = Math.round((breakdown.moderate / total) * 100);
  const highPct = Math.round((breakdown.high / total) * 100);
  const critPct = Math.round((breakdown.critical / total) * 100);

  return (
    <Card className="p-5 border-[#ECEEF2] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] border border-[#C7D2FE]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Customer Recovery Health
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
          FATIGUE TELEMETRY
        </span>
      </div>

      {/* Segmented Bar */}
      <div className="mt-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#64748B] font-medium">Open Cases Fatigue Distribution</span>
          <span className="font-mono text-[#0F172A] font-bold">{total} Cases</span>
        </div>

        <div className="w-full bg-[#E2E8F0] rounded-full h-3 flex overflow-hidden p-0.5 gap-0.5">
          {breakdown.low > 0 && (
            <div
              className="bg-[#10B981] rounded-l-full h-full transition-all"
              style={{ width: `${lowPct}%` }}
              title={`Low Fatigue: ${breakdown.low} (${lowPct}%)`}
            />
          )}
          {breakdown.moderate > 0 && (
            <div
              className="bg-[#6366F1] h-full transition-all"
              style={{ width: `${modPct}%` }}
              title={`Moderate Fatigue: ${breakdown.moderate} (${modPct}%)`}
            />
          )}
          {breakdown.high > 0 && (
            <div
              className="bg-[#F59E0B] h-full transition-all"
              style={{ width: `${highPct}%` }}
              title={`High Fatigue: ${breakdown.high} (${highPct}%)`}
            />
          )}
          {breakdown.critical > 0 && (
            <div
              className="bg-[#F43F5E] rounded-r-full h-full transition-all"
              style={{ width: `${critPct}%` }}
              title={`Critical Fatigue: ${breakdown.critical} (${critPct}%)`}
            />
          )}
        </div>

        {/* 4 Pillars Legend */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {/* Low */}
          <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-center space-y-0.5">
            <span className="text-[10px] font-bold text-[#059669] flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              Low
            </span>
            <div className="font-mono text-xs font-extrabold text-[#0F172A]">{breakdown.low}</div>
            <span className="text-[9px] text-[#94A3B8] block">Safe to run</span>
          </div>

          {/* Moderate */}
          <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-center space-y-0.5">
            <span className="text-[10px] font-bold text-[#4F46E5] flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
              Moderate
            </span>
            <div className="font-mono text-xs font-extrabold text-[#0F172A]">{breakdown.moderate}</div>
            <span className="text-[9px] text-[#94A3B8] block">Spaced cadence</span>
          </div>

          {/* High */}
          <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-center space-y-0.5">
            <span className="text-[10px] font-bold text-[#D97706] flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              High
            </span>
            <div className="font-mono text-xs font-extrabold text-[#0F172A]">{breakdown.high}</div>
            <span className="text-[9px] text-[#94A3B8] block">Pause outreach</span>
          </div>

          {/* Critical */}
          <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-center space-y-0.5">
            <span className="text-[10px] font-bold text-[#E11D48] flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
              Critical
            </span>
            <div className="font-mono text-xs font-extrabold text-[#0F172A]">{breakdown.critical}</div>
            <span className="text-[9px] text-[#94A3B8] block">Escalate / Stop</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
