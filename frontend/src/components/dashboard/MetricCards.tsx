import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  XCircle, 
  Sparkles 
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardSummary } from '../../types';

interface MetricCardsProps {
  summary: DashboardSummary;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Revenue at Risk */}
      <Card className="p-4 border-rose-500/20 bg-gradient-to-b from-rose-950/20 to-slate-900/90">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Revenue at Risk</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-rose-400 font-mono">
          {formatCurrency(summary.total_revenue_at_risk)}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          In {summary.open_recovery_cases_count} active cases
        </p>
      </Card>

      {/* 2. Revenue Recovered */}
      <Card className="p-4 border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-slate-900/90">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Revenue Recovered</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-emerald-400 font-mono">
          {formatCurrency(summary.total_revenue_recovered)}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Captured via smart recovery
        </p>
      </Card>

      {/* 3. Recovery Rate */}
      <Card className="p-4 border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-slate-900/90">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Recovery Rate</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-indigo-400 font-mono">
          {summary.recovery_rate_pct}%
        </div>
        <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(summary.recovery_rate_pct, 100)}%` }}
          />
        </div>
      </Card>

      {/* 4. Open Cases */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Open Cases</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-100 font-mono">
          {summary.open_recovery_cases_count}
        </div>
        <p className="mt-1 text-[11px] text-amber-400/90">
          Requires intervention / retry
        </p>
      </Card>

      {/* 5. Failed Payments */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Failed Payments</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <XCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-200 font-mono">
          {summary.total_failed_payments_count}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Out of {summary.total_payments_count} transactions
        </p>
      </Card>

      {/* 6. Successful Recoveries */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Recovered Count</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-100 font-mono">
          {summary.successful_recoveries_count}
        </div>
        <p className="mt-1 text-[11px] text-emerald-400/90">
          Successfully resolved cases
        </p>
      </Card>
    </div>
  );
};
