import React from 'react';
import { Card } from '../common/Card';
import { Bot, Zap, PlusCircle, LineChart, Sparkles, AlertTriangle } from 'lucide-react';

interface QuickActionsCardProps {
  onRunAIAgent: () => void;
  onViewHighPriority: () => void;
  onSimulateFailure: () => void;
  onViewAnalytics: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onRunAIAgent,
  onViewHighPriority,
  onSimulateFailure,
  onViewAnalytics,
}) => {
  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
          Quick Actions
        </h2>
      </div>

      {/* 4 Rounded Action Cards matching FicoPay layout (Top Up / Transfer / Pay / More) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Action 1: Run AI Agent */}
        <button
          onClick={onRunAIAgent}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#F5F3FF] border border-[#ECEEF2] hover:border-[#DDD6FE] transition-all group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Bot className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-[#0F172A] text-center">
            Run AI Agent
          </span>
          <span className="text-[10px] text-[#8B5CF6] font-semibold">
            Evaluate
          </span>
        </button>

        {/* Action 2: High Priority Cases */}
        <button
          onClick={onViewHighPriority}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#FFFBEB] border border-[#ECEEF2] hover:border-[#FDE68A] transition-all group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-[#0F172A] text-center">
            High Priority
          </span>
          <span className="text-[10px] text-[#D97706] font-semibold">
            Cases
          </span>
        </button>

        {/* Action 3: Add Recovery Case (Simulate Failure) */}
        <button
          onClick={onSimulateFailure}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#ECFDF5] border border-[#ECEEF2] hover:border-[#A7F3D0] transition-all group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] group-hover:scale-105 transition-transform">
            <PlusCircle className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-[#0F172A] text-center">
            Simulate Case
          </span>
          <span className="text-[10px] text-[#059669] font-semibold">
            Trigger Drop-off
          </span>
        </button>

        {/* Action 4: View Analytics */}
        <button
          onClick={onViewAnalytics}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#ECEEF2] hover:border-[#C7D2FE] transition-all group cursor-pointer"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE] group-hover:scale-105 transition-transform">
            <LineChart className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-bold text-[#0F172A] text-center">
            Analytics
          </span>
          <span className="text-[10px] text-[#4F46E5] font-semibold">
            Overview
          </span>
        </button>
      </div>
    </Card>
  );
};
