import React from 'react';
import { Card } from '../common/Card';
import { MoreVertical, ShieldCheck, Zap } from 'lucide-react';

export const AgentHealthCard: React.FC = () => {
  return (
    <Card className="p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#181C28] tracking-tight">Agent Health</h2>
        <button className="text-[#94A3B8] hover:text-[#181C28] transition-colors p-1">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Main Metric */}
      <div className="my-3 space-y-1">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Decision Engine Quality
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-extrabold text-[#181C28] tracking-tight">
            Optimal
          </div>
          <span className="text-lg font-bold text-[#10B981] font-mono">99.4%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="h-2 w-full bg-[#EAE6DF] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#10B981] to-[#059669] rounded-full transition-all duration-500"
            style={{ width: '99%' }}
          />
        </div>

        <div className="pt-2 border-t border-[#F0ECE4] flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
            <span>REAL_LLM Active</span>
          </div>
          <span className="font-mono text-[#181C28] font-bold">GPT-OSS-120B</span>
        </div>
      </div>
    </Card>
  );
};
