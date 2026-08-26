import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  XCircle, 
  Loader2, 
  Zap,
  Lock,
  FileCheck,
  Activity
} from 'lucide-react';
import { PipelineStageResult } from '../../types';

interface AgentPipelineStepperProps {
  stages: PipelineStageResult[];
  isRunning?: boolean;
  activeStageIndex?: number;
}

export const AgentPipelineStepper: React.FC<AgentPipelineStepperProps> = ({
  stages,
  isRunning = false,
  activeStageIndex = 0,
}) => {
  const getStageIcon = (stageId: string, status: string) => {
    if (status === 'running') {
      return <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />;
    }
    if (status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-[#10B981]" />;
    }
    if (status === 'blocked') {
      return <Lock className="h-4 w-4 text-[#F59E0B]" />;
    }
    if (status === 'failed') {
      return <XCircle className="h-4 w-4 text-[#F43F5E]" />;
    }

    switch (stageId) {
      case 'context_gathering':
      case 'context_synthesis': return <Bot className="h-4 w-4 text-[#64748B]" />;
      case 'fatigue_assessment': return <Activity className="h-4 w-4 text-[#6366F1]" />;
      case 'ai_reasoning': return <Sparkles className="h-4 w-4 text-[#7C3AED]" />;
      case 'guardrail_verification': return <ShieldCheck className="h-4 w-4 text-[#10B981]" />;
      case 'action_execution': return <Zap className="h-4 w-4 text-[#2563EB]" />;
      case 'agent_completion': return <FileCheck className="h-4 w-4 text-[#8B5CF6]" />;
      default: return <Clock className="h-4 w-4 text-[#64748B]" />;
    }
  };

  const getStageStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">COMPLETED</Badge>;
      case 'running':
        return <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-0.5 text-[10px] font-bold border border-[#C7D2FE] animate-pulse">RUNNING</span>;
      case 'blocked':
        return <Badge variant="warning" size="sm">BLOCKED SAFELY</Badge>;
      case 'failed':
        return <Badge variant="danger" size="sm">FAILED</Badge>;
      default:
        return <Badge variant="neutral" size="sm">PENDING</Badge>;
    }
  };

  return (
    <Card className="p-6 border-[#ECEEF2] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              Autonomous AI Recovery Pipeline
              {isRunning && (
                <span className="text-[10px] font-mono font-bold text-[#6366F1] bg-[#EEF2FF] px-2 py-0.5 rounded-full border border-[#C7D2FE] animate-pulse">
                  EXECUTING LIVE
                </span>
              )}
            </h3>
            <p className="text-xs text-[#64748B]">
              Multi-stage deterministic orchestration with Fatigue Detection & Groq GPT-OSS-120B reasoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
          <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
          <span>7 Verification Gates</span>
        </div>
      </div>

      {/* Stepper List */}
      <div className="mt-4 space-y-2.5">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isBlocked = stage.status === 'blocked';
          const isRunningStage = stage.status === 'running';

          return (
            <div
              key={stage.stage_id || idx}
              className={`p-3.5 rounded-2xl border transition-all ${
                isRunningStage
                  ? 'border-[#6366F1] bg-[#EEF2FF]/40 shadow-sm'
                  : isCompleted
                  ? 'border-[#A7F3D0] bg-[#ECFDF5]/30'
                  : isBlocked
                  ? 'border-[#FDE68A] bg-[#FFFBEB]/40'
                  : 'border-[#ECEEF2] bg-[#F8FAFC]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                    isCompleted
                      ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                      : isBlocked
                      ? 'bg-[#FFFBEB] border-[#FDE68A]'
                      : isRunningStage
                      ? 'bg-[#EEF2FF] border-[#C7D2FE]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}>
                    {getStageIcon(stage.stage_id, stage.status)}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#94A3B8]">
                        0{idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-[#0F172A]">
                        {stage.title}
                      </h4>
                      {stage.metadata?.decision_source && (
                        <span className="font-mono text-[9px] font-bold uppercase text-[#7C3AED] bg-[#F5F3FF] px-1.5 py-0.5 rounded border border-[#DDD6FE]">
                          {stage.metadata.decision_source} ({stage.metadata.model_used || 'GPT-OSS-120B'})
                        </span>
                      )}
                      {stage.stage_id === 'fatigue_assessment' && stage.metadata?.score !== undefined && (
                        <span className="font-mono text-[9px] font-bold uppercase text-[#6366F1] bg-[#EEF2FF] px-1.5 py-0.5 rounded border border-[#C7D2FE]">
                          Score: {stage.metadata.score}/100 ({stage.metadata.level})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStageStatusBadge(stage.status)}
                  {stage.duration_ms !== undefined && (
                    <span className="text-[10px] font-mono font-semibold text-[#94A3B8]">
                      {stage.duration_ms}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

