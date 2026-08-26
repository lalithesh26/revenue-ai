import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Plus, ArrowRight, Bot, Zap } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface RevenueAtRiskCardProps {
  summary: DashboardSummary;
  onViewCases: () => void;
  onRunFirstAgent: () => void;
}

export const RevenueAtRiskCard: React.FC<RevenueAtRiskCardProps> = ({
  summary,
  onViewCases,
  onRunFirstAgent,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <Card className="p-6 flex flex-col justify-between bg-gradient-to-br from-white via-white to-[#FDF4F0] border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Revenue at Risk</h2>
        <button 
          onClick={onViewCases}
          title="Open Case Management"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E4DC] text-[#475569] hover:text-[#181C28] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Financial Figure */}
      <div className="my-2 space-y-0.5">
        <div className="text-2xl lg:text-3xl font-extrabold text-[#181C28] tracking-tight font-sans">
          {formatCurrency(summary.total_revenue_at_risk)}
        </div>
        <p className="text-xs font-medium text-[#64748B]">
          Across {summary.open_recovery_cases_count} open recovery cases
        </p>
      </div>

      {/* Primary Actions */}
      <div className="pt-2 flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onViewCases}
          icon={<ArrowRight className="h-3.5 w-3.5" />}
          className="flex-1 rounded-2xl text-xs py-2 shadow-sm font-bold"
        >
          View Cases
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunFirstAgent}
          icon={<Zap className="h-3.5 w-3.5 text-[#E86343]" />}
          className="flex-1 rounded-2xl text-xs py-2 font-bold"
        >
          Run Agent
        </Button>
      </div>
    </Card>
  );
};
