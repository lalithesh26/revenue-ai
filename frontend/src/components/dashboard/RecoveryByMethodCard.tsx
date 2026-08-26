import React from 'react';
import { Card } from '../common/Card';
import { CreditCard, Smartphone, Building2, Repeat } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface RecoveryByMethodCardProps {
  summary: DashboardSummary;
}

export const RecoveryByMethodCard: React.FC<RecoveryByMethodCardProps> = ({ summary }) => {
  const methodBreakdown = summary.recovery_by_method_breakdown || [];

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4 text-[#2563EB]" />;
      case 'upi':
        return <Smartphone className="h-4 w-4 text-[#0D8A60]" />;
      case 'netbanking':
        return <Building2 className="h-4 w-4 text-[#C47406]" />;
      case 'mandate':
        return <Repeat className="h-4 w-4 text-[#6D28D9]" />;
      default:
        return <CreditCard className="h-4 w-4 text-[#64748B]" />;
    }
  };

  const getMethodBg = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return 'bg-[#EEF4FF] border-[#D0E1FD]';
      case 'upi':
        return 'bg-[#EAF8F1] border-[#C6EFDC]';
      case 'netbanking':
        return 'bg-[#FEF6E9] border-[#FDE3BE]';
      case 'mandate':
        return 'bg-[#F4F0FF] border-[#DDD0F8]';
      default:
        return 'bg-[#FAF8F5] border-[#E8E4DC]';
    }
  };

  return (
    <Card className="p-6 flex flex-col justify-between border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Payment Channels</h2>
          <p className="text-xs text-[#64748B]">Channel recovery velocity</p>
        </div>
        <span className="text-[11px] font-semibold text-[#E86343] bg-[#FDF1ED] px-2.5 py-0.5 rounded-full border border-[#F9CEBF]">
          Efficiency
        </span>
      </div>

      {/* Methods List */}
      <div className="my-2 space-y-2.5">
        {methodBreakdown.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-4 text-center">No payment channel data</p>
        ) : (
          methodBreakdown.slice(0, 4).map((m, idx) => {
            const rate = m.count > 0 ? Math.round((m.recovered / m.count) * 100) : 0;
            return (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-2xl border border-[#F2ECE4] bg-[#FAF8F5]"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-xl border ${getMethodBg(m.method)}`}>
                    {getMethodIcon(m.method)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C28] uppercase tracking-wider font-mono">
                      {m.method.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {m.count} failed / {m.recovered} recovered
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-extrabold text-[#0D8A60] font-mono">
                    {rate}%
                  </span>
                  <span className="text-[10px] font-semibold text-[#64748B]">
                    Success Rate
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Summary Pill */}
      <div className="pt-2 border-t border-[#F0ECE4] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Multi-Gateway Routing</span>
        <span className="font-bold text-[#181C28]">Active (Mock)</span>
      </div>
    </Card>
  );
};
