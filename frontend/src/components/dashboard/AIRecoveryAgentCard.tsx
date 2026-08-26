import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Mic, 
  Paperclip, 
  MoreVertical, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { DashboardSummary } from '../../types';

interface AIRecoveryAgentCardProps {
  summary: DashboardSummary;
  onRunAgent: () => void;
  onSelectSuggestion?: (type: string) => void;
}

export const AIRecoveryAgentCard: React.FC<AIRecoveryAgentCardProps> = ({
  summary,
  onRunAgent,
  onSelectSuggestion,
}) => {
  const [promptInput, setPromptInput] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const suggestions = [
    { label: 'Recover high-value payment', type: 'high_value', icon: '⚡' },
    { label: 'Review risky cases', type: 'risky', icon: '🛡️' },
    { label: 'Analyze bank timeouts', type: 'timeouts', icon: '🔄' },
    { label: 'View agent activity', type: 'activity', icon: '📊' },
  ];

  return (
    <Card className="p-7 relative overflow-hidden flex flex-col justify-between border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#FDF1ED] text-[#E86343] border border-[#F9CEBF]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#181C28] tracking-tight flex items-center gap-1.5">
              AI Recovery Agent
              <Sparkles className="h-3.5 w-3.5 text-[#E86343]" />
            </h2>
            <p className="text-xs text-[#64748B]">
              Autonomously analyze failed payments and execute safe recovery strategies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#EAF8F1] px-3 py-1 text-[11px] font-bold text-[#0D8A60] border border-[#C6EFDC]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
            REAL_LLM · GPT-OSS-120B
          </span>
          <button className="text-[#94A3B8] hover:text-[#181C28] p-1 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center AI Visualization & Prompt Section */}
      <div className="py-6 flex flex-col items-center text-center space-y-4">
        {/* Soft Coral AI Recovery Orb */}
        <div className="relative flex items-center justify-center my-1">
          {/* Subtle Ambient Glow */}
          <div className="absolute h-24 w-24 rounded-full bg-gradient-to-tr from-[#E86343]/20 via-[#F58D74]/30 to-amber-200/20 blur-xl animate-pulse"></div>
          
          {/* Floating Orb */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#E86343] via-[#FA7E64] to-[#FDB09C] shadow-lg shadow-[#E86343]/35 animate-orb text-white">
            <Sparkles className="h-8 w-8 text-white drop-shadow-md" />
            <div className="absolute inset-0 rounded-full border border-white/40"></div>
          </div>
        </div>

        {/* Question Heading */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#181C28]">
            What should RevenueAI do next?
          </h3>
          <p className="text-xs text-[#64748B] max-w-md">
            The autonomous decision brain evaluates customer LTV, gateway codes, and past success to recommend optimal recovery actions.
          </p>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg pt-1">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (onSelectSuggestion) onSelectSuggestion(s.type);
                else onRunAgent();
              }}
              className="flex items-center gap-1.5 rounded-full border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-[#F4F0E8] hover:border-[#D8D2C5] px-3.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#181C28] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all cursor-pointer"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Interactive Action & Status Bar */}
      <div className="space-y-3 pt-2">
        <div className="relative flex items-center rounded-full border border-[#E2DDD5] bg-[#FAF8F5] p-1.5 pl-4 shadow-sm focus-within:border-[#E86343] focus-within:ring-2 focus-within:ring-[#E86343]/15 transition-all">
          <input
            type="text"
            placeholder="Ask RevenueAI or run autonomous evaluation..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#181C28] placeholder-[#94A3B8] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRunAgent();
            }}
          />
          
          <div className="flex items-center gap-1.5 pr-1">
            <Button
              variant="coral"
              size="sm"
              onClick={onRunAgent}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              className="rounded-full px-4 text-xs font-bold shadow-md shadow-[#E86343]/25"
            >
              🤖 Run AI Recovery Agent
            </Button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#64748B] px-3 pt-1 border-t border-[#F0ECE4]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-[#181C28]">
              <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
              Agent Monitored: <strong className="font-mono text-[#181C28]">{summary.open_recovery_cases_count} cases</strong>
            </span>
            <span>·</span>
            <span>Revenue at risk: <strong className="font-mono text-[#DC2626] font-semibold">{formatCurrency(summary.total_revenue_at_risk)}</strong></span>
          </div>

          <div className="flex items-center gap-1 font-medium text-[#8C98A4]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
            <span>Deterministic Guardrails Active</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
