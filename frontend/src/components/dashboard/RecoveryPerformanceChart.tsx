import React, { useState } from 'react';
import { Card } from '../common/Card';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { DashboardSummary } from '../../types';

interface RecoveryPerformanceChartProps {
  summary: DashboardSummary;
}

export const RecoveryPerformanceChart: React.FC<RecoveryPerformanceChartProps> = ({ summary }) => {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Card className="p-6 flex flex-col justify-between border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Recovery Performance</h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-[#181C28] font-sans">
              {formatCurrency(summary.total_revenue_recovered)}
            </span>
            <span className="text-xs font-semibold text-[#0D8A60] bg-[#EAF8F1] px-2 py-0.5 rounded-full border border-[#C6EFDC]">
              {summary.recovery_rate_pct}% captured
            </span>
          </div>
        </div>

        {/* Time Selector Dropdown */}
        <div className="flex rounded-full border border-[#E8E4DC] bg-[#FAF8F5] p-1 text-xs">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              timeRange === 'month' ? 'bg-white text-[#181C28] shadow-sm' : 'text-[#64748B] hover:text-[#181C28]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              timeRange === 'quarter' ? 'bg-white text-[#181C28] shadow-sm' : 'text-[#64748B] hover:text-[#181C28]'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center gap-4 text-xs font-medium text-[#64748B] pt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
          <span>Revenue Recovered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E86343]"></span>
          <span>Revenue at Risk</span>
        </div>
      </div>

      {/* Clean SVG Area Chart */}
      <div className="my-2 h-44 w-full relative">
        <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E86343" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#E86343" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="40" x2="500" y2="40" stroke="#F0ECE4" strokeDasharray="3 3" />
          <line x1="0" y1="80" x2="500" y2="80" stroke="#F0ECE4" strokeDasharray="3 3" />
          <line x1="0" y1="120" x2="500" y2="120" stroke="#F0ECE4" strokeDasharray="3 3" />

          {/* Risk Area & Curve */}
          <path
            d="M 0 110 Q 70 60 140 90 T 280 50 T 420 70 T 500 45 L 500 160 L 0 160 Z"
            fill="url(#riskGrad)"
          />
          <path
            d="M 0 110 Q 70 60 140 90 T 280 50 T 420 70 T 500 45"
            fill="none"
            stroke="#E86343"
            strokeWidth="2.5"
          />

          {/* Recovered Area & Curve */}
          <path
            d="M 0 140 Q 70 120 140 100 T 280 75 T 420 50 T 500 35 L 500 160 L 0 160 Z"
            fill="url(#recoveredGrad)"
          />
          <path
            d="M 0 140 Q 70 120 140 100 T 280 75 T 420 50 T 500 35"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
          />

          {/* Focus Tooltip Node */}
          <circle cx="280" cy="75" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="280" cy="50" r="4.5" fill="#E86343" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </div>

      {/* X-Axis Labels */}
      <div className="flex items-center justify-between text-[11px] font-medium text-[#94A3B8] px-1 pt-1 border-t border-[#F0ECE4]">
        {months.map((m, idx) => (
          <span key={idx}>{m}</span>
        ))}
      </div>
    </Card>
  );
};
