import React from 'react';
import { Card } from '../common/Card';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface FailureDistributionCardProps {
  summary: DashboardSummary;
}

export const FailureDistributionCard: React.FC<FailureDistributionCardProps> = ({ summary }) => {
  const failureBreakdown = summary.failure_reasons_breakdown || [];
  const maxCount = Math.max(...failureBreakdown.map((f) => f.count), 1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getReasonColor = (idx: number) => {
    const colors = [
      'bg-[#E86343]',
      'bg-[#F59E0B]',
      'bg-[#6366F1]',
      'bg-[#10B981]',
      'bg-[#8B5CF6]',
    ];
    return colors[idx % colors.length];
  };

  return (
    <Card className="p-6 flex flex-col justify-between border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Failure Categories</h2>
          <p className="text-xs text-[#64748B]">Drop-off root causes</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[#E8E4DC] bg-[#FAF8F5] px-2.5 py-0.5 text-xs font-semibold text-[#475569] shadow-sm">
          <span>Top 4</span>
          <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
        </div>
      </div>

      {/* Categories Bars */}
      <div className="my-2 space-y-3">
        {failureBreakdown.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-4 text-center">No failure reasons logged</p>
        ) : (
          failureBreakdown.slice(0, 4).map((f, idx) => {
            const pct = Math.round((f.count / maxCount) * 100);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getReasonColor(idx)}`} />
                    <span className="font-semibold text-[#181C28] truncate max-w-[130px]" title={f.reason}>
                      {f.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#94A3B8]">{f.count} cases</span>
                    <span className="text-xs font-bold text-[#181C28] font-sans">{formatCurrency(f.amount)}</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getReasonColor(idx)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-[#F0ECE4] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Smart Triage</span>
        <span className="font-bold text-[#0D8A60]">Auto-Classified</span>
      </div>
    </Card>
  );
};
