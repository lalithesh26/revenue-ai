import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { 
  History, 
  Bot, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Code
} from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditTimelineProps {
  logs: AuditLog[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'case_detected': return <Badge variant="warning" dot>CASE DETECTED</Badge>;
      case 'agent_started': return <Badge variant="violet" dot>AGENT STARTED</Badge>;
      case 'context_gathered': return <Badge variant="info" dot>CONTEXT SYNTHESIZED</Badge>;
      case 'agent_decision': return <Badge variant="purple" dot>AI DECISION</Badge>;
      case 'guardrail_evaluated': return <Badge variant="indigo" dot>GUARDRAILS EVALUATED</Badge>;
      case 'action_executed': return <Badge variant="amber" dot>ACTION EXECUTED</Badge>;
      case 'payment_recovered': return <Badge variant="success" dot>REVENUE RECOVERED</Badge>;
      case 'case_closed': return <Badge variant="neutral" dot>CASE CLOSED</Badge>;
      case 'agent_completed': return <Badge variant="success" dot>CYCLE COMPLETED</Badge>;
      default: return <Badge variant="neutral">{eventType}</Badge>;
    }
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'recovery_agent': return <Bot className="h-4 w-4 text-[#7C3AED]" />;
      case 'guardrail_engine': return <ShieldCheck className="h-4 w-4 text-[#10B981]" />;
      case 'mock_payment_provider': return <CheckCircle2 className="h-4 w-4 text-[#059669]" />;
      default: return <Zap className="h-4 w-4 text-[#2563EB]" />;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Card className="p-6 border-[#ECEEF2] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] border border-[#ECEEF2]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Chronological Audit Ledger</h3>
            <p className="text-xs text-[#64748B]">Append-only database record of agent decisions and safety verifications</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[#64748B] bg-[#F8FAFC] px-2.5 py-1 rounded-full border border-[#ECEEF2]">
          {logs.length} Events Logged
        </span>
      </div>

      <div className="mt-5 relative pl-6 border-l-2 border-[#E2E8F0] space-y-4">
        {logs.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-4">No audit events recorded yet.</p>
        ) : (
          logs.map((log) => {
            let metadataParsed = null;
            if (log.metadata_json) {
              try {
                metadataParsed = JSON.parse(log.metadata_json);
              } catch (e) {
                metadataParsed = log.metadata_json;
              }
            }

            const isExpanded = expandedId === log.id;

            return (
              <div key={log.id} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-[#6366F1] shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]"></div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] hover:border-[#CBD5E1] transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-xl bg-white border border-[#ECEEF2]">
                        {getActorIcon(log.actor)}
                      </div>
                      {getEventBadge(log.event_type)}
                      <span className="text-xs font-bold text-[#0F172A] capitalize">
                        {log.actor.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[#8C98A4]">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#334155] leading-relaxed">
                    {log.description}
                  </p>

                  {metadataParsed && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span>{isExpanded ? 'Hide metadata' : 'View structured metadata'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 rounded-xl bg-white p-3 border border-[#ECEEF2] overflow-x-auto text-[11px] font-mono text-[#0F172A]">
                          <pre>{JSON.stringify(metadataParsed, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
