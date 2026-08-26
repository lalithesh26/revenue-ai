import React from 'react';
import { Card } from '../common/Card';
import { Bot, Sparkles, ShieldCheck, MoreVertical, Cpu, ShieldAlert } from 'lucide-react';

export const AIAgentStatusCard: React.FC = () => {
  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white h-full flex flex-col justify-between">
      {/* Header matching FicoPay "My Cards" */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#0F172A] tracking-tight flex items-center gap-1.5">
          AI Agent
        </h2>
        <span className="text-xs font-semibold text-[#6366F1] hover:text-[#4F46E5] flex items-center gap-1 cursor-pointer">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>Online</span>
        </span>
      </div>

      {/* 2 Stacked Card Modules matching FicoPay's "Primary Card" / "Business Card" */}
      <div className="my-3 space-y-3">
        {/* Module 1: Primary Decision Engine */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
            <span className="font-medium">Primary Model</span>
            <span className="font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-md border border-[#DDD6FE] text-[10px]">
              REAL_LLM
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#0F172A] font-mono">
              GPT-OSS-120B
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B]">
              <Cpu className="h-3.5 w-3.5 text-[#6366F1]" />
              <span>Groq API</span>
            </div>
          </div>
        </div>

        {/* Module 2: Fallback Engine & Safety */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
            <span className="font-medium">Fallback & Safety</span>
            <span className="font-mono font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0] text-[10px]">
              6/6 GUARDRAILS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#0F172A] font-mono">
              HEURISTIC_FALLBACK
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#059669]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
              <span>Isolated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status strip */}
      <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Decision Latency</span>
        <span className="font-mono font-semibold text-[#0F172A]">~140ms (Groq Turbo)</span>
      </div>
    </Card>
  );
};
