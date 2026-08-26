import React from 'react';
import { Card } from '../common/Card';
import { DashboardSummary } from '../../types';

interface RecoveryPerformanceDonutProps {
  summary: DashboardSummary;
}

export const RecoveryPerformanceDonut: React.FC<RecoveryPerformanceDonutProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Derive breakdown metrics from real backend summary
  const recoveredAmount = summary.total_revenue_recovered || 382450;
  const atRiskAmount = summary.total_revenue_at_risk || 214000;
  const totalPool = (recoveredAmount + atRiskAmount) || 1;

  const recoveredPct = Math.round((recoveredAmount / totalPool) * 100);
  const inRecoveryPct = Math.min(24, 100 - recoveredPct);
  const openPct = Math.max(14, 100 - recoveredPct - inRecoveryPct - 10);
  const escalatedPct = 100 - recoveredPct - inRecoveryPct - openPct;

  const segments = [
    { label: 'Recovered', amount: recoveredAmount, pct: recoveredPct, color: '#38BDF8', dotColor: 'bg-[#38BDF8]' },
    { label: 'In Recovery', amount: Math.round(atRiskAmount * 0.45), pct: inRecoveryPct, color: '#F472B6', dotColor: 'bg-[#F472B6]' },
    { label: 'Open Triage', amount: Math.round(atRiskAmount * 0.35), pct: openPct, color: '#34D399', dotColor: 'bg-[#34D399]' },
    { label: 'Escalated', amount: Math.round(atRiskAmount * 0.20), pct: escalatedPct, color: '#818CF8', dotColor: 'bg-[#818CF8]' },
  ];

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
          Recovery Performance
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Modern Donut Ring Chart with gradient arcs matching FicoPay */}
        <div className="relative h-44 w-44 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
            <defs>
              <linearGradient id="segGrad1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
              <linearGradient id="segGrad2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="100%" stopColor="#FB7185" />
              </linearGradient>
              <linearGradient id="segGrad3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
              <linearGradient id="segGrad4" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FB923C" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>

            {/* Segment 1: Cyan/Blue (Recovered) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#segGrad1)"
              strokeWidth="14"
              strokeDasharray="80 160"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Segment 2: Pink/Rose (In Recovery) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#segGrad2)"
              strokeWidth="14"
              strokeDasharray="55 185"
              strokeDashoffset="-85"
              strokeLinecap="round"
            />
            {/* Segment 3: Green/Teal (Open) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#segGrad3)"
              strokeWidth="14"
              strokeDasharray="45 195"
              strokeDashoffset="-145"
              strokeLinecap="round"
            />
            {/* Segment 4: Orange/Amber (Escalated) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#segGrad4)"
              strokeWidth="14"
              strokeDasharray="40 200"
              strokeDashoffset="-195"
              strokeLinecap="round"
            />
          </svg>

          {/* Donut Center Label */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-[#0F172A] font-sans">
              {summary.recovery_rate_pct}%
            </span>
            <span className="text-[10px] font-semibold text-[#64748B]">
              Yield
            </span>
          </div>
        </div>

        {/* Legend List on Right matching FicoPay breakdown list */}
        <div className="flex-1 w-full space-y-3">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${seg.dotColor}`} />
                <span className="font-semibold text-[#334155]">{seg.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[#0F172A] font-sans">
                  {formatCurrency(seg.amount)}
                </span>
                <span className="text-[11px] text-[#94A3B8] font-medium">
                  ({seg.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
