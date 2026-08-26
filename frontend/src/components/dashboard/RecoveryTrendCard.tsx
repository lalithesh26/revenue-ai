import React, { useState } from 'react';
import { Card } from '../common/Card';
import { DashboardSummary } from '../../types';

interface RecoveryTrendCardProps {
  summary: DashboardSummary;
}

export const RecoveryTrendCard: React.FC<RecoveryTrendCardProps> = ({ summary }) => {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white flex flex-col justify-between">
      {/* Header matching FicoPay Wallet Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            Recovery Trend
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Revenue Recovered vs Revenue at Risk
          </p>
        </div>

        {/* Legend Pills matching FicoPay's Income/Expenses legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-[#334155]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]"></span>
            <span>Recovered</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#334155]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]"></span>
            <span>At Risk</span>
          </div>
        </div>
      </div>

      {/* Time Range Pills */}
      <div className="flex items-center justify-end pt-1">
        <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 text-xs">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeRange === 'month' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeRange === 'quarter' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Quarter
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeRange === 'year' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Smooth Wave Area Chart (matching FicoPay's purple & cyan curved lines) */}
      <div className="my-4 h-48 w-full relative">
        <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
          <defs>
            {/* Soft gradient fills for area under curve */}
            <linearGradient id="ficopayRecoveredGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="ficopayRiskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Subtle Grid horizontal lines */}
          <line x1="0" y1="35" x2="500" y2="35" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="115" x2="500" y2="115" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="155" x2="500" y2="155" stroke="#F1F5F9" strokeWidth="1" />

          {/* Cyan/Blue Curve (Revenue Recovered - Smooth Sine Wave) */}
          <path
            d="M 0 130 C 50 145, 100 100, 150 115 C 200 130, 240 70, 285 90 C 330 110, 380 65, 430 85 C 470 100, 490 80, 500 75 L 500 155 L 0 155 Z"
            fill="url(#ficopayRecoveredGrad)"
          />
          <path
            d="M 0 130 C 50 145, 100 100, 150 115 C 200 130, 240 70, 285 90 C 330 110, 380 65, 430 85 C 470 100, 490 80, 500 75"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Purple/Violet Curve (Revenue at Risk - Smooth Peaks Wave) */}
          <path
            d="M 0 150 C 60 140, 100 120, 150 125 C 200 130, 245 40, 285 45 C 325 50, 370 110, 420 100 C 460 90, 485 120, 500 115 L 500 155 L 0 155 Z"
            fill="url(#ficopayRiskGrad)"
          />
          <path
            d="M 0 150 C 60 140, 100 120, 150 125 C 200 130, 245 40, 285 45 C 325 50, 370 110, 420 100 C 460 90, 485 120, 500 115"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Highlight Dot on Peak Month (Apr - matching FicoPay screenshot) */}
          <circle cx="285" cy="45" r="7" fill="#8B5CF6" />
          <circle cx="285" cy="45" r="4" fill="#FFFFFF" />

          <circle cx="285" cy="90" r="5" fill="#38BDF8" />
          <circle cx="285" cy="90" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* X-Axis Month Labels with Apr highlighted */}
      <div className="flex items-center justify-between text-xs text-[#94A3B8] px-2 pt-1 border-t border-[#F1F5F9]">
        {months.map((m, idx) => (
          <span 
            key={idx} 
            className={m === 'Apr' ? 'font-bold text-[#0F172A]' : 'font-medium'}
          >
            {m}
          </span>
        ))}
      </div>
    </Card>
  );
};
