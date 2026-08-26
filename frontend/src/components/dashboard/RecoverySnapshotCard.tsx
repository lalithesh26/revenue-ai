import React from 'react';
import { Card } from '../common/Card';
import { ChevronDown, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface RecoverySnapshotCardProps {
  summary: DashboardSummary;
}

export const RecoverySnapshotCard: React.FC<RecoverySnapshotCardProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Financial Snapshot</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#475569] shadow-sm cursor-pointer hover:border-[#D8D2C5]">
          <span>Customize View</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
        </div>
      </div>

      {/* 3 Metric Tiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {/* Metric 1: Revenue at Risk */}
        <div className="rounded-2xl border border-[#F2ECE4] bg-[#FAF8F5] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#FDECEB] text-[#DC2626]">
              <AlertTriangle className="h-3 w-3" />
            </span>
            <span>Total at Risk</span>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-[#181C28] tracking-tight font-sans">
            {formatCurrency(summary.total_revenue_at_risk)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>From failed payments</span>
            <span className="rounded-full bg-[#FDECEB] px-2 py-0.5 font-bold text-[#DC2626] text-[10px]">
              {summary.open_recovery_cases_count} cases
            </span>
          </div>
        </div>

        {/* Metric 2: Revenue Recovered */}
        <div className="rounded-2xl border border-[#F2ECE4] bg-[#FAF8F5] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#EAF8F1] text-[#0D8A60]">
              <CheckCircle2 className="h-3 w-3" />
            </span>
            <span>Total Recovered</span>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-[#181C28] tracking-tight font-sans">
            {formatCurrency(summary.total_revenue_recovered)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Autonomous captured</span>
            <span className="rounded-full bg-[#EAF8F1] px-2 py-0.5 font-bold text-[#0D8A60] text-[10px] flex items-center gap-0.5">
              +{summary.successful_recoveries_count} settled
            </span>
          </div>
        </div>

        {/* Metric 3: Recovery Rate */}
        <div className="rounded-2xl border border-[#F2ECE4] bg-[#FAF8F5] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#FDF1ED] text-[#E86343]">
              <TrendingUp className="h-3 w-3" />
            </span>
            <span>Recovery Rate</span>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-[#181C28] tracking-tight font-sans">
            {summary.recovery_rate_pct}%
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Efficiency target</span>
            <span className="rounded-full bg-[#EAF8F1] px-2 py-0.5 font-bold text-[#0D8A60] text-[10px]">
              +12.4% vs baseline
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
