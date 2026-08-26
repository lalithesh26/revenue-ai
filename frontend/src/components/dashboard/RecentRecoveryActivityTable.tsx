import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CreditCard, Smartphone, Building2, Repeat, ArrowRight, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import { RecoveryCase } from '../../types';

interface RecentRecoveryActivityTableProps {
  cases: RecoveryCase[];
  onSelectCase: (caseId: string) => void;
  onViewAllCases: () => void;
}

export const RecentRecoveryActivityTable: React.FC<RecentRecoveryActivityTableProps> = ({
  cases,
  onSelectCase,
  onViewAllCases,
}) => {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getMethodIcon = (method?: string, status?: string) => {
    if (status === 'recovered') {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      );
    }
    switch (method) {
      case 'upi':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
            <Smartphone className="h-4 w-4" />
          </div>
        );
      case 'netbanking':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFFBEB] text-[#D97706]">
            <Building2 className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#64748B] border border-[#ECEEF2]">
            <CreditCard className="h-4 w-4" />
          </div>
        );
    }
  };

  const recentCases = cases.slice(0, 5);

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white">
      {/* Header matching FicoPay Recent Transactions */}
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
          Recent Recovery Activity
        </h2>
        <button
          onClick={onViewAllCases}
          className="text-xs font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors cursor-pointer"
        >
          View All
        </button>
      </div>

      {/* Clean list of items matching FicoPay Recent Transactions rows */}
      <div className="divide-y divide-[#F1F5F9]">
        {recentCases.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">
            No recent recovery activity recorded.
          </div>
        ) : (
          recentCases.map((c) => {
            const isRecovered = c.status === 'recovered';
            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] rounded-2xl px-2.5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {getMethodIcon(c.payment_method, c.status)}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#6366F1] transition-colors truncate max-w-[160px]">
                      {c.customer_name || 'Customer'}
                    </span>
                    <span className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                      <span className="font-mono">{c.id.substring(0, 8)}</span>
                      <span>·</span>
                      <span>{c.failure_reason || 'Card decline'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold font-sans ${isRecovered ? 'text-[#059669]' : 'text-[#0F172A]'}`}>
                    {isRecovered ? `+${formatCurrency(c.revenue_at_risk)}` : formatCurrency(c.revenue_at_risk)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                      isRecovered 
                        ? 'bg-[#ECFDF5] text-[#059669]' 
                        : c.status === 'in_recovery'
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'bg-[#FFFBEB] text-[#D97706]'
                    }`}>
                      {isRecovered ? 'Recovered' : c.status === 'in_recovery' ? 'In Recovery' : 'Open'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
