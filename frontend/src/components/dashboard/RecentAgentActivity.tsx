import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Bot, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { AgentDecision } from '../../types';

interface RecentAgentActivityProps {
  decisions: AgentDecision[];
  onSelectCase?: (caseId: string) => void;
}

export const RecentAgentActivity: React.FC<RecentAgentActivityProps> = ({
  decisions,
  onSelectCase,
}) => {
  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'retry': return <Badge variant="info" dot>SMART RETRY</Badge>;
      case 'send_payment_link': return <Badge variant="purple" dot>PAYMENT LINK</Badge>;
      case 'send_reminder': return <Badge variant="warning" dot>SEND REMINDER</Badge>;
      case 'escalate': return <Badge variant="danger" dot>ESCALATE</Badge>;
      case 'stop': return <Badge variant="neutral" dot>STOP RECOVERY</Badge>;
      default: return <Badge variant="neutral">{decision}</Badge>;
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Live Agent Recommendations</h3>
            <p className="text-[11px] text-slate-400">Contextual decisions evaluated with safety guardrails</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono">
          <Sparkles className="h-3.5 w-3.5" />
          Autonomous Engine
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-800/60">
        {decisions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No agent activity logged yet.</p>
        ) : (
          decisions.map((d) => (
            <div
              key={d.id}
              className="py-3 flex items-start justify-between gap-4 group hover:bg-slate-800/30 px-2 rounded-lg transition-colors cursor-pointer"
              onClick={() => onSelectCase && onSelectCase(d.recovery_case_id)}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getDecisionBadge(d.decision)}
                  <span className="text-[11px] font-mono text-slate-400">
                    Confidence: {(d.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Case: {d.recovery_case_id.substring(0, 12)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {d.reasoning}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
