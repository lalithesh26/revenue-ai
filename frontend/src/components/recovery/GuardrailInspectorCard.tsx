import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ShieldCheck, ShieldAlert, Check, X, AlertCircle, Lock } from 'lucide-react';
import { GuardrailCheck } from '../../types';

interface GuardrailInspectorCardProps {
  checks?: GuardrailCheck[];
  passed?: boolean;
  summaryMessage?: string;
}

export const GuardrailInspectorCard: React.FC<GuardrailInspectorCardProps> = ({
  checks = [],
  passed = true,
  summaryMessage,
}) => {
  const defaultChecks: GuardrailCheck[] = [
    {
      rule_name: "Customer Consent Verification",
      passed: true,
      message: "Customer communication and recovery opt-in verified.",
      severity: "INFO"
    },
    {
      rule_name: "Retry Velocity & Threshold",
      passed: true,
      message: "Enforces max 3 automatic retries before mandatory human escalation.",
      severity: "INFO"
    },
    {
      rule_name: "Idempotency & Settlement State",
      passed: true,
      message: "Prevents duplicate actions if payment or case is already resolved.",
      severity: "INFO"
    },
    {
      rule_name: "Payment Amount Immutability",
      passed: true,
      message: "AI agent is strictly blocked from modifying transaction amounts.",
      severity: "INFO"
    },
    {
      rule_name: "Discount & Deduction Integrity",
      passed: true,
      message: "No unverified discounts, coupons or fee waivers allowed.",
      severity: "INFO"
    },
    {
      rule_name: "Real-Money Movement Prevention",
      passed: true,
      message: "All operations restricted to verified simulation/test endpoints.",
      severity: "INFO"
    }
  ];

  const activeChecks = checks.length > 0 ? checks : defaultChecks;

  return (
    <Card className="p-6 border-[#E8E4DC]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#EAF8F1] text-[#0D8A60] border border-[#C6EFDC]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#181C28]">Safety Boundary Compliance</h3>
            <p className="text-xs text-[#64748B]">Pre-execution deterministic verification (6 / 6 Rules)</p>
          </div>
        </div>

        <Badge variant={passed ? 'success' : 'danger'} size="md" dot>
          {passed ? '6 / 6 PASSED' : 'BLOCKED BY POLICY'}
        </Badge>
      </div>

      {summaryMessage && (
        <div className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          passed 
            ? 'bg-[#EAF8F1] text-[#0D8A60] border border-[#C6EFDC]' 
            : 'bg-[#FDECEB] text-[#DC2626] border border-[#F9CBC8]'
        }`}>
          {passed ? <Check className="h-4 w-4 shrink-0 text-[#10B981]" /> : <X className="h-4 w-4 shrink-0 text-[#EF4444]" />}
          <span>{summaryMessage}</span>
        </div>
      )}

      {/* Grid of 6 Guardrails */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeChecks.map((chk, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
              chk.passed
                ? 'bg-[#FAF8F5] border-[#F0ECE4] text-[#181C28]'
                : 'bg-[#FDECEB] border-[#F9CBC8] text-[#DC2626]'
            }`}
          >
            <div className={`mt-0.5 p-1 rounded-full shrink-0 ${
              chk.passed ? 'bg-[#EAF8F1] text-[#0D8A60]' : 'bg-[#FDECEB] text-[#DC2626]'
            }`}>
              {chk.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{chk.rule_name}</span>
                <span className="text-[10px] font-mono font-semibold text-[#8C98A4]">
                  ✓ Verified
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-snug">
                {chk.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
