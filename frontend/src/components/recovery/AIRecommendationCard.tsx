import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Bot, Sparkles, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, StopCircle } from 'lucide-react';
import { AgentDecisionType, RecoveryPriority } from '../../types';

interface AIRecommendationCardProps {
  decision?: AgentDecisionType | string;
  reasoning?: string;
  confidence?: number;
  priority?: RecoveryPriority | string;
  onAnalyze?: () => void;
  onExecute?: () => void;
  onNavigateNextCase?: () => void;
  analyzing?: boolean;
  executing?: boolean;
  caseStatus?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  decision,
  reasoning,
  confidence,
  priority,
  onAnalyze,
  onExecute,
  onNavigateNextCase,
  analyzing = false,
  executing = false,
  caseStatus = 'open',
}) => {
  const getDecisionVariant = (d?: string) => {
    switch (d) {
      case 'retry': return 'info';
      case 'send_payment_link': return 'purple';
      case 'send_reminder': return 'warning';
      case 'escalate': return 'danger';
      case 'stop': return 'neutral';
      default: return 'info';
    }
  };

  const getPriorityVariant = (p?: string) => {
    switch (p) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'neutral';
    }
  };

  const isEscalatedOrStopped = decision === 'escalate' || decision === 'stop';

  return (
    <Card className="p-5 border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/90 to-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              AI Recovery Recommendation
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            </h3>
            <p className="text-[11px] text-slate-400">Contextual recommendation engine with deterministic safety fallbacks</p>
          </div>
        </div>

        {priority && (
          <Badge variant={getPriorityVariant(priority)} size="md" dot>
            Priority: {priority.toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {decision ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Recommended Action:</span>
                <Badge variant={getDecisionVariant(decision)} size="md" className="font-mono text-xs uppercase px-3 py-1">
                  {decision.replace(/_/g, ' ')}
                </Badge>
              </div>

              {confidence !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Confidence Score:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${(confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {(confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Agent Rationale & Context</span>
              <p className="text-xs text-slate-200 leading-relaxed p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 font-sans">
                {reasoning}
              </p>
            </div>

            {/* If case was escalated or stopped, show explicit stoppage banner and next case navigation */}
            {decision === 'escalate' && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Automated processing stopped. Case assigned to senior retention operations.</span>
                </div>
                {onNavigateNextCase && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onNavigateNextCase}
                    icon={<ArrowRight className="h-3.5 w-3.5" />}
                    className="bg-indigo-600 hover:bg-indigo-500 shrink-0 text-xs font-bold"
                  >
                    Move to Next Case
                  </Button>
                )}
              </div>
            )}

            {decision === 'stop' && (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <StopCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Automated outreach stopped per compliance policy.</span>
                </div>
                {onNavigateNextCase && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateNextCase}
                    icon={<ArrowRight className="h-3.5 w-3.5" />}
                    className="shrink-0 text-xs font-bold"
                  >
                    Move to Next Case
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <Button
                variant="outline"
                size="sm"
                onClick={onAnalyze}
                loading={analyzing}
                icon={<Bot className="h-3.5 w-3.5" />}
              >
                Re-Analyze Context
              </Button>

              {!isEscalatedOrStopped && caseStatus !== 'recovered' && caseStatus !== 'closed' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onExecute}
                  loading={executing}
                  icon={<ShieldCheck className="h-4 w-4" />}
                >
                  Verify Guardrails & Execute Action
                </Button>
              )}

              {caseStatus === 'recovered' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Case Resolved & Recovered</span>
                  </div>
                  {onNavigateNextCase && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onNavigateNextCase}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Next Case
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-xs text-slate-400">
              No AI evaluation recorded yet for this recovery case. Run analysis to generate contextual strategy.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={onAnalyze}
              loading={analyzing}
              icon={<Sparkles className="h-4 w-4" />}
            >
              Analyze Payment & Recommend Strategy
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
