import React from 'react';
import { Card } from '../common/Card';
import { PieChart, CreditCard, Layers } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface FailureChartProps {
  summary: DashboardSummary;
}

export const FailureChart: React.FC<FailureChartProps> = ({ summary }) => {
  const failureBreakdown = summary.failure_reasons_breakdown || [];
  const methodBreakdown = summary.recovery_by_method_breakdown || [];

  const maxCount = Math.max(...failureBreakdown.map(f => f.count), 1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'credit_card': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'debit_card': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'upi': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'netbanking': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'mandate': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-700/40 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Failure Categories Breakdown */}
      <Card className="p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">Top Payment Failure Reasons</h3>
          </div>
          <span className="text-xs text-slate-400">At-Risk Distribution</span>
        </div>

        <div className="mt-4 space-y-3.5">
          {failureBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No failure data available</p>
          ) : (
            failureBreakdown.map((item, idx) => {
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300 truncate max-w-[280px]" title={item.reason}>
                      {item.reason}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400 font-mono">{item.count} cases</span>
                      <span className="text-slate-200 font-semibold font-mono">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-rose-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 2. Recovery by Payment Method */}
      <Card className="p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">Recovery by Payment Instrument</h3>
          </div>
          <span className="text-xs text-slate-400">Channel Efficiency</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {methodBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center col-span-2">No payment method data available</p>
          ) : (
            methodBreakdown.map((m, idx) => {
              const rate = m.count > 0 ? Math.round((m.recovered / m.count) * 100) : 0;
              return (
                <div key={idx} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold border ${getMethodBadgeColor(m.method)}`}>
                      {m.method.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      {rate}% recovered
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>{m.count} failed / at-risk</span>
                    <span className="text-slate-200 font-mono font-medium">{formatCurrency(m.amount)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
