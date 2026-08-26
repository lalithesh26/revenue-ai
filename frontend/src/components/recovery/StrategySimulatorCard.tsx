import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Sliders, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Send,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import { StrategyEvaluation, StrategySimulationResponse } from '../../types';
import { api } from '../../services/api';

interface StrategySimulatorCardProps {
  caseId: string;
  onExecuteStrategy?: (strategy: string) => void;
  executing?: boolean;
}

export const StrategySimulatorCard: React.FC<StrategySimulatorCardProps> = ({
  caseId,
  onExecuteStrategy,
  executing = false
}) => {
  const [simulation, setSimulation] = useState<StrategySimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const fetchSimulation = async () => {
    try {
      setLoading(true);
      const data = await api.simulateStrategy(caseId);
      setSimulation(data);
      if (data.recommended_strategy) {
        setSelectedStrategy(data.recommended_strategy);
      } else if (data.strategies.length > 0) {
        setSelectedStrategy(data.strategies[0].strategy);
      }
    } catch (err) {
      console.error('Failed to simulate recovery strategies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchSimulation();
    }
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-5 border-[#ECEEF2] bg-white animate-pulse">
        <div className="h-4 bg-[#E2E8F0] rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-[#E2E8F0] rounded w-full mb-3"></div>
        <div className="h-20 bg-[#E2E8F0] rounded w-full"></div>
      </Card>
    );
  }

  if (!simulation) {
    return null;
  }

  const getStrategyIcon = (strat: string) => {
    switch (strat) {
      case 'retry':
        return <RefreshCw className="h-4 w-4 text-[#3B82F6]" />;
      case 'send_payment_link':
        return <Send className="h-4 w-4 text-[#10B981]" />;
      case 'send_reminder':
        return <Clock className="h-4 w-4 text-[#8B5CF6]" />;
      case 'wait':
        return <Clock className="h-4 w-4 text-[#F59E0B]" />;
      case 'escalate':
        return <PhoneCall className="h-4 w-4 text-[#EF4444]" />;
      default:
        return <Sliders className="h-4 w-4 text-[#64748B]" />;
    }
  };

  const getSuitabilityColor = (score: number, eligible: boolean) => {
    if (!eligible) return 'text-[#94A3B8]';
    if (score >= 75) return 'text-[#10B981]';
    if (score >= 50) return 'text-[#3B82F6]';
    if (score >= 30) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getSuitabilityBg = (score: number, eligible: boolean) => {
    if (!eligible) return 'bg-[#F1F5F9] border-[#E2E8F0]';
    if (score >= 75) return 'bg-[#ECFDF5] border-[#A7F3D0]';
    if (score >= 50) return 'bg-[#EFF6FF] border-[#BFDBFE]';
    if (score >= 30) return 'bg-[#FFFBEB] border-[#FDE68A]';
    return 'bg-[#FEF2F2] border-[#FECDD3]';
  };

  const currentSelected = simulation.strategies.find(s => s.strategy === selectedStrategy);

  return (
    <Card className="p-5 border-[#ECEEF2] bg-white relative overflow-hidden flex flex-col justify-between">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-[#8B5CF6]/10 to-[#6366F1]/10 blur-2xl" />

      <div className="relative z-10">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#8B5CF6] border border-[#DDD6FE]">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Strategy Simulator
              </h3>
            </div>
          </div>
          <button
            onClick={fetchSimulation}
            className="text-[10px] font-mono font-bold text-[#8B5CF6] hover:text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] px-2.5 py-1 rounded-lg border border-[#DDD6FE] transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Re-Simulate
          </button>
        </div>

        {/* Explainer Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] text-[11px] text-[#64748B] flex items-start gap-2 leading-relaxed">
          <Info className="h-3.5 w-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
          <span>
            Suitability score (0-100) indicates contextual appropriateness based on current signals. It is not a calibrated predictive probability of recovery.
          </span>
        </div>

        {/* Strategy List */}
        <div className="mt-4 space-y-2">
          {simulation.strategies.map((strat) => {
            const isSelected = strat.strategy === selectedStrategy;
            return (
              <div
                key={strat.strategy}
                onClick={() => setSelectedStrategy(strat.strategy)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-[#8B5CF6] bg-[#FAF5FF] shadow-sm ring-1 ring-[#8B5CF6]/30' 
                    : 'border-[#ECEEF2] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs">
                      {getStrategyIcon(strat.strategy)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {strat.display_name}
                        </span>
                        {strat.recommended && (
                          <Badge variant="success" size="sm">RECOMMENDED</Badge>
                        )}
                        {!strat.eligible && (
                          <Badge variant="neutral" size="sm">INELIGIBLE</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#64748B]">
                        <span>Impact: <strong className="capitalize">{strat.customer_impact}</strong></span>
                        <span>•</span>
                        <span>Risk: <strong className="capitalize">{strat.execution_risk}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${getSuitabilityBg(strat.suitability_score, strat.eligible)} ${getSuitabilityColor(strat.suitability_score, strat.eligible)}`}>
                      {strat.eligible ? `Suitability: ${strat.suitability_score}/100` : 'Blocked'}
                    </div>
                  </div>
                </div>

                {/* Expanded Details when Selected */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-[#E9D5FF] space-y-2 text-xs">
                    {strat.reasons.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B21A8]">
                          Strategic Rationale:
                        </div>
                        {strat.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#4C1D95]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {strat.blockers.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B]">
                          Deterministic Blocker:
                        </div>
                        {strat.blockers.map((b, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#7F1D1D] bg-[#FEF2F2] p-2 rounded-lg border border-[#FECDD3]">
                            <XCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Execution Button */}
                    {onExecuteStrategy && strat.eligible && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExecuteStrategy(strat.strategy);
                          }}
                          disabled={executing}
                          className="text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Execute {strat.display_name}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pt-3 mt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
        <span>Deterministic Multi-Strategy Scorer</span>
        <span>Guardrail Enforced Pre-Execution</span>
      </div>
    </Card>
  );
};
