import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  RotateCcw, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Bot, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Filter, 
  BarChart3, 
  PieChart,
  ShieldCheck,
  Activity,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { RecoveryTrendCard } from '../dashboard/RecoveryTrendCard';
import { RecoveryPerformanceDonut } from '../dashboard/RecoveryPerformanceDonut';
import { DashboardSummary, AnalyticsOverview } from '../../types';
import { api } from '../../services/api';

interface AnalyticsViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ summary, loading, onRefresh }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverview | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  const fetchFullAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await api.getAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.warn('Failed to load dedicated analytics endpoint, falling back to dashboard summary:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchFullAnalytics();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading && !summary && !analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="h-8 w-8 border-3 border-[#6366F1]/30 border-t-[#6366F1] rounded-full animate-spin"></div>
        <p className="text-xs text-[#64748B] font-medium">Computing live revenue recovery analytics...</p>
      </div>
    );
  }

  const revenueRecovered = analyticsData?.overview.total_revenue_recovered ?? summary?.total_revenue_recovered ?? 0;
  const revenueAtRisk = analyticsData?.overview.total_revenue_at_risk ?? summary?.total_revenue_at_risk ?? 0;
  const recoveryRate = analyticsData?.overview.recovery_rate_pct ?? summary?.recovery_rate_pct ?? 0;
  const openCasesCount = analyticsData?.overview.open_cases_count ?? summary?.open_recovery_cases_count ?? 0;

  const pressureDist = analyticsData?.recovery_pressure_distribution || summary?.recovery_fatigue_breakdown || { low: 0, moderate: 0, high: 0, critical: 0 };
  const riskDist = analyticsData?.transaction_risk_distribution || { low: 0, moderate: 0, high: 0, critical: 0 };

  const strategyPerf = analyticsData?.strategy_performance || [
    { strategy: 'retry', display_name: 'Retry Payment', decisions_count: 0, executed_count: 0, recovered_amount: 0 },
    { strategy: 'send_payment_link', display_name: 'Send Payment Link', decisions_count: 0, executed_count: 0, recovered_amount: 0 },
    { strategy: 'send_reminder', display_name: 'Send Reminder', decisions_count: 0, executed_count: 0, recovered_amount: 0 },
    { strategy: 'wait', display_name: 'Wait 24 Hours', decisions_count: 0, executed_count: 0, recovered_amount: 0 },
    { strategy: 'escalate', display_name: 'Escalate to Human', decisions_count: 0, executed_count: 0, recovered_amount: 0 },
  ];

  const failureReasons = summary?.failure_reasons_breakdown || [];
  const maxReasonCount = Math.max(...failureReasons.map(r => r.count), 1);
  const methods = summary?.recovery_by_method_breakdown || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ECEEF2]">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            Revenue Recovery & Intelligence Analytics
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time analytics across Transaction Risk, Recovery Pressure, Strategy Suitability, and Gateway Yield.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRefresh();
              fetchFullAnalytics();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:text-[#0F172A] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </button>
          <span className="rounded-full bg-[#ECFDF5] text-[#059669] font-mono text-[10px] font-bold px-2.5 py-1 border border-[#A7F3D0]">
            ● Real-Time SQL Feed
          </span>
        </div>
      </div>

      {/* Row 1: High Level KPI Metric Tiles (4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white border-[#ECEEF2] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-bold">
            <span>Revenue Recovered</span>
            <div className="p-1.5 rounded-xl bg-[#ECFDF5] text-[#059669]">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatCurrency(revenueRecovered)}
          </div>
          <div className="text-[11px] text-[#059669] font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Captured via AI Pipeline</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border-[#ECEEF2] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-bold">
            <span>Revenue at Risk</span>
            <div className="p-1.5 rounded-xl bg-[#FFF1F2] text-[#E11D48]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatCurrency(revenueAtRisk)}
          </div>
          <div className="text-[11px] text-[#E11D48] font-semibold">
            {openCasesCount} open recovery cases
          </div>
        </Card>

        <Card className="p-5 bg-white border-[#ECEEF2] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-bold">
            <span>Recovery Yield</span>
            <div className="p-1.5 rounded-xl bg-[#F5F3FF] text-[#7C3AED]">
              <LineChart className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#7C3AED]">
            {recoveryRate}%
          </div>
          <div className="text-[11px] text-[#64748B] font-medium">
            Calculated over total at-risk pool
          </div>
        </Card>

        <Card className="p-5 bg-white border-[#ECEEF2] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-bold">
            <span>Guardrail Intercepts</span>
            <div className="p-1.5 rounded-xl bg-[#ECFDF5] text-[#059669]">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#059669]">
            {analyticsData?.overview.total_guardrail_blocks || 0}
          </div>
          <div className="text-[11px] text-[#64748B] font-medium">
            Zero hallucinated fee debits
          </div>
        </Card>
      </div>

      {/* Row 2: Intelligence Signals Breakdown (Pressure + Risk Distributions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recovery Pressure Distribution */}
        <Card className="p-5 bg-white border-[#ECEEF2] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#EEF2FF] text-[#6366F1]">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Recovery Pressure Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#6366F1] bg-[#EEF2FF] px-2 py-0.5 rounded-full border border-[#C7D2FE]">
              CADENCE MONITOR
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="text-lg font-bold font-mono text-[#059669]">{pressureDist.low || 0}</div>
              <div className="text-[10px] font-bold text-[#065F46] uppercase">Low</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE]">
              <div className="text-lg font-bold font-mono text-[#4F46E5]">{pressureDist.moderate || 0}</div>
              <div className="text-[10px] font-bold text-[#3730A3] uppercase">Moderate</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
              <div className="text-lg font-bold font-mono text-[#D97706]">{pressureDist.high || 0}</div>
              <div className="text-[10px] font-bold text-[#92400E] uppercase">High</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3]">
              <div className="text-lg font-bold font-mono text-[#E11D48]">{pressureDist.critical || 0}</div>
              <div className="text-[10px] font-bold text-[#9F1239] uppercase">Critical</div>
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] leading-snug">
            Measures observable outreach activity and density across active cases. High pressure triggers cooling intervals without hard-blocking legitimate retries.
          </p>
        </Card>

        {/* Current Transaction Risk Distribution */}
        <Card className="p-5 bg-white border-[#ECEEF2] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#E0F2FE] text-[#0284C7]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Current Transaction Risk Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full border border-[#BAE6FD]">
              TRANSACTION CONTEXT
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="text-lg font-bold font-mono text-[#059669]">{riskDist.low || 0}</div>
              <div className="text-[10px] font-bold text-[#065F46] uppercase">Low</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE]">
              <div className="text-lg font-bold font-mono text-[#4F46E5]">{riskDist.moderate || 0}</div>
              <div className="text-[10px] font-bold text-[#3730A3] uppercase">Moderate</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
              <div className="text-lg font-bold font-mono text-[#D97706]">{riskDist.high || 0}</div>
              <div className="text-[10px] font-bold text-[#92400E] uppercase">High</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3]">
              <div className="text-lg font-bold font-mono text-[#E11D48]">{riskDist.critical || 0}</div>
              <div className="text-[10px] font-bold text-[#9F1239] uppercase">Critical</div>
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] leading-snug">
            Evaluates observable risk signals for the current payment transaction. Elevated risk routes transactions to human review rather than automatic gateway reattempts.
          </p>
        </Card>
      </div>

      {/* Row 3: Charts (Trend Card + Donut Card) */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RecoveryTrendCard summary={summary} />
          </div>
          <div className="lg:col-span-5">
            <RecoveryPerformanceDonut summary={summary} />
          </div>
        </div>
      )}

      {/* Row 4: Strategy Execution & Failure Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Strategy Performance */}
        <div className="lg:col-span-7">
          <Card className="p-6 bg-white border-[#ECEEF2] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[#8B5CF6]" />
                  <span>Recovery Strategy Execution & Yield</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  AI decisions formulated vs actual revenue captured by strategy.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {strategyPerf.map((strat, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0F172A] block">{strat.display_name}</span>
                    <span className="text-[11px] text-[#64748B]">
                      {strat.decisions_count} decisions formulated · {strat.executed_count} executed
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-[#059669] block">
                      {formatCurrency(strat.recovered_amount)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">Recovered</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Failure Reasons Breakdown */}
        <div className="lg:col-span-5">
          <Card className="p-6 bg-white border-[#ECEEF2] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#6366F1]" />
                  <span>Failure Causes</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Top decline categories by frequency.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {failureReasons.map((item, idx) => {
                const pct = Math.round((item.count / maxReasonCount) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#334155] truncate max-w-[200px]">{item.reason}</span>
                      <span className="font-mono text-[#0F172A] font-bold">{item.count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
