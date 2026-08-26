import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { 
  PlayCircle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  RotateCcw,
  ExternalLink
} from 'lucide-react';

interface DemoStepperProps {
  onTriggerQuickDemo: () => void;
  onOpenFirstCase: () => void;
}

export const DemoStepper: React.FC<DemoStepperProps> = ({
  onTriggerQuickDemo,
  onOpenFirstCase,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    { num: 1, title: "Open Dashboard", desc: "View real-time high-level recovery metrics & risk pool." },
    { num: 2, title: "Review Revenue at Risk", desc: "Identify critical high-value subscription drop-offs." },
    { num: 3, title: "Select Failed Payment", desc: "Choose a failed transaction across Cards, UPI, or Mandates." },
    { num: 4, title: "Open Recovery Case", desc: "Inspect multi-layered customer & subscription history." },
    { num: 5, title: "Analyze Payment", desc: "Trigger the autonomous AI Recovery Agent for recommendation." },
    { num: 6, title: "Display Customer Context", desc: "Evaluate LTV, past success rate, risk score & consent." },
    { num: 7, title: "AI Recommends Action", desc: "Structured output (Retry, Payment Link, Reminder, Escalate)." },
    { num: 8, title: "Guardrails Validate", desc: "Strict verification (Consent, Max Retries, Zero Discounts)." },
    { num: 9, title: "Execute Recovery", desc: "Safe simulated execution via MockPaymentProvider interface." },
    { num: 10, title: "Simulate Recovery", desc: "Simulate customer settlement / auto-retry capture." },
    { num: 11, title: "Dashboard Updates", desc: "Watch live revenue recovered metric & recovery rate increase." },
    { num: 12, title: "Inspect Audit Trail", desc: "Chronological cryptographic-grade audit logs for compliance." },
  ];

  return (
    <Card className="p-5 border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-purple-950/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500 text-white text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-bold text-white">RevenueAI Live Buildathon Demo Flow</h3>
            <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              100% Deterministic & Safe
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Follow the 12-step autonomous recovery sequence: from failed payment detection to guardrail-verified settlement.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Steps' : 'View 12-Step Flow'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenFirstCase}
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Start Interactive Flow
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {steps.map((s) => (
              <div 
                key={s.num} 
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-start gap-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
                  {s.num}
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-slate-200">{s.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
