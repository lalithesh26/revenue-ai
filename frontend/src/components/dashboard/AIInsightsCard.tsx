import React from 'react';
import { Card } from '../common/Card';
import { Sparkles, Lightbulb, ArrowRight } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface AIInsightsCardProps {
  summary: DashboardSummary;
  onViewMore?: () => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ summary, onViewMore }) => {
  const formatCompactLakh = (val: number) => {
    if (val >= 100000) {
      const lakhs = (val / 100000).toFixed(1);
      return `₹${lakhs}L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const topFailure = summary.failure_reasons_breakdown?.[0]?.reason || 'Card-expiry';

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white h-full flex flex-col justify-between">
      {/* Header matching FicoPay AI Insights */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#7C3AED]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            AI Recovery Insights
          </h2>
        </div>
      </div>

      {/* Insight Items with light background and bulb icon matching FicoPay */}
      <div className="my-3 space-y-2.5">
        {/* Insight 1 */}
        <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-[#7C3AED] shrink-0 mt-0.5" />
          <p className="text-xs text-[#334155] leading-relaxed">
            <strong className="text-[#0F172A] font-semibold">{formatCompactLakh(summary.total_revenue_at_risk)}</strong> of revenue is currently at risk across <strong className="text-[#0F172A]">{summary.open_recovery_cases_count} open cases</strong>.
          </p>
        </div>

        {/* Insight 2 */}
        <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-[#6366F1] shrink-0 mt-0.5" />
          <p className="text-xs text-[#334155] leading-relaxed">
            <strong className="text-[#0F172A] font-semibold">{topFailure}</strong> failures have the highest recovery potential via smart payment links.
          </p>
        </div>
      </div>

      {/* FicoPay-style Soft Gradient CTA Button */}
      <button
        onClick={onViewMore}
        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#FAF5FF] hover:from-[#EDE9FE] hover:to-[#E0E7FF] text-[#6D28D9] text-xs font-bold border border-[#DDD6FE]/60 shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
      >
        <span>View More Insights</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </Card>
  );
};
