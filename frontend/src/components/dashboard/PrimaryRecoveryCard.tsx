import React, { useState } from 'react';
import { Card } from '../common/Card';
import { TrendingUp, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface PrimaryRecoveryCardProps {
  summary: DashboardSummary;
}

export const PrimaryRecoveryCard: React.FC<PrimaryRecoveryCardProps> = ({ summary }) => {
  const [showAmount, setShowAmount] = useState(true);

  // Format currency with clean Indian number format
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Convert large amounts to clean Lakh notation if over 1 Lakh, or standard currency
  const formatCompactLakh = (val: number) => {
    if (val >= 100000) {
      const lakhs = (val / 100000).toFixed(2);
      return `₹${lakhs}L`;
    }
    return formatCurrency(val);
  };

  return (
    <Card className="relative overflow-hidden p-6 lg:p-7 border-[#ECEEF2] bg-white h-full flex flex-col justify-between">
      {/* Soft pastel violet/cyan mesh glow in top right corner (matching FicoPay reference) */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#8B5CF6]/15 via-[#6366F1]/10 to-[#06B6D4]/10 blur-3xl" />
      
      {/* Top Row: Pill Badge + Eye Toggle */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#059669] border border-[#A7F3D0]">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>+12.5% vs last month</span>
        </span>

        <button
          onClick={() => setShowAmount(!showAmount)}
          title={showAmount ? "Hide balance" : "Show balance"}
          className="text-[#94A3B8] hover:text-[#0F172A] transition-colors p-1 rounded-lg hover:bg-[#F8FAFC]"
        >
          {showAmount ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Dominant Figure */}
      <div className="relative z-10 my-4 space-y-1">
        <div className="text-xs font-semibold text-[#64748B] tracking-wide">
          Revenue Recovered
        </div>
        <div className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0F172A] font-sans">
          {showAmount ? formatCurrency(summary.total_revenue_recovered) : '••••••••'}
        </div>
      </div>

      {/* Bottom Row: 2 Compact Metrics matching FicoPay Income/Expenses */}
      <div className="relative z-10 grid grid-cols-2 gap-4 pt-3 border-t border-[#F1F5F9]">
        <div>
          <div className="text-[11px] font-medium text-[#64748B]">Revenue at Risk</div>
          <div className="text-base font-bold text-[#0F172A] mt-0.5 font-sans">
            {showAmount ? formatCompactLakh(summary.total_revenue_at_risk) : '••••'}
          </div>
          <span className="text-[10px] text-[#94A3B8] font-medium">
            {summary.open_recovery_cases_count} active cases
          </span>
        </div>

        <div>
          <div className="text-[11px] font-medium text-[#64748B]">Recovery Rate</div>
          <div className="text-base font-bold text-[#059669] mt-0.5 font-sans">
            {summary.recovery_rate_pct}%
          </div>
          <span className="text-[10px] text-[#059669] font-medium">
            +{summary.successful_recoveries_count} settled
          </span>
        </div>
      </div>
    </Card>
  );
};
