import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Bot, 
  ShieldCheck, 
  History, 
  LineChart, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  BookOpen,
  ArrowRight,
  Activity,
  Sliders,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../common/Card';

interface FAQItem {
  question: string;
  category: string;
  answer: React.ReactNode;
}

export const HelpCenterView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      category: 'AI Engine',
      question: 'How does the RevenueAI Autonomous Recovery Agent make decisions?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            When a payment fails, RevenueAI initiates an 8-stage autonomous intelligence pipeline:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-[#334155]">
            <li><strong>Context Gathering:</strong> Collects customer LTV, past payment success rates, subscription tier, and communication consent.</li>
            <li><strong>Transaction Risk Assessment:</strong> Evaluates payment method reliability, historical failure patterns, and decline reason codes.</li>
            <li><strong>Recovery Pressure & Fatigue:</strong> Computes contact frequency, retry counts, and customer irritability signals to avoid spamming.</li>
            <li><strong>Strategy Simulation:</strong> Evaluates candidate actions (Retry, Payment Link, Reminder, Wait, Escalate) with suitability scoring.</li>
            <li><strong>AI LLM Reasoning:</strong> Groq LLM (<code>openai/gpt-oss-120b</code>) generates reasoned recommendation with confidence and priority.</li>
            <li><strong>Deterministic Guardrails:</strong> Evaluates 6+ zero-trust safety checks (consent, retry cap, idempotency, amount lock).</li>
            <li><strong>Provider Execution:</strong> Dispatches action through isolated payment provider (mock/sandbox).</li>
            <li><strong>Audit Logging:</strong> Seals every stage and JSON payload into an immutable audit trail.</li>
          </ol>
        </div>
      )
    },
    {
      category: 'Safety & Guardrails',
      question: 'What is the difference between BLOCKED and ESCALATED guardrail outcomes?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            The Guardrail Engine enforces deterministic rules with distinct outcomes:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-[#E11D48]">BLOCKED:</strong> The automated action is strictly rejected because it violates a hard safety policy (e.g., customer consent revoked, duplicate charge detected, invalid invoice amount). No outreach or payment retry occurs.
            </li>
            <li>
              <strong className="text-[#D97706]">ESCALATED:</strong> The case exceeds automated safe operating parameters (e.g., max 3 retries reached, critical transaction risk, VIP enterprise account) and is systematically routed to human customer success / retention operations.
            </li>
          </ul>
        </div>
      )
    },
    {
      category: 'Recovery Fatigue',
      question: 'How is Customer Recovery Fatigue and Pressure calculated?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            The Recovery Pressure Engine scores customer fatigue (0-100) based on observable signals:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Attempt Velocity:</strong> How many automated retries or messages have occurred in the last 24-72 hours.</li>
            <li><strong>Interval Spacing:</strong> Exponential backoff delay between attempts (enforcing minimum rest periods).</li>
            <li><strong>Customer Sensitivity:</strong> Historical responsiveness and consent status.</li>
          </ul>
          <p className="pt-1 text-[#334155]">
            Fatigue tiers: <span className="font-semibold text-[#059669]">LOW (0-30)</span>, <span className="font-semibold text-[#3B82F6]">MODERATE (31-60)</span>, <span className="font-semibold text-[#D97706]">HIGH (61-85)</span>, and <span className="font-semibold text-[#E11D48]">CRITICAL (86-100)</span>. When CRITICAL, automated messaging is blocked.
          </p>
        </div>
      )
    },
    {
      category: 'Strategy Simulator',
      question: 'What is the Strategy Simulator and does it move money directly?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            The Strategy Simulator provides <strong>decision support</strong> by calculating contextual suitability scores (0-100) for all candidate actions before execution.
          </p>
          <p>
            Simulation is non-destructive: it evaluates risk factors, decline codes, and customer context to recommend the highest-yield path. Funds are only moved when an action is executed through the payment provider layer.
          </p>
        </div>
      )
    },
    {
      category: 'Workflows',
      question: 'How do I simulate gateway failures and verify end-to-end recovery?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            You can test the entire pipeline using the built-in simulation buttons:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Click the <strong>`+`</strong> button in the top navigation bar to generate a realistic failed payment across various gateway decline codes.</li>
            <li>Click <strong>`Run Autonomous Agent`</strong> on the case to observe the autonomous recommendation and guardrail validation.</li>
            <li>Click <strong>`Simulate Settlement`</strong> in the case modal to emulate customer payment fulfillment and see live revenue metrics increment.</li>
          </ul>
        </div>
      )
    },
    {
      category: 'Security & Keys',
      question: 'Where are API keys stored and are they visible to users?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            In accordance with enterprise fintech standards, all sensitive credentials (such as Groq LLM API keys, JWT signing keys, and database connection strings) are stored purely in server-side environment variables and are never exposed or rendered in the frontend.
          </p>
        </div>
      )
    },
    {
      category: 'Audit & Compliance',
      question: 'How do I inspect the immutable audit trail for compliance?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            Navigate to the <strong>Audit Trail</strong> tab from the sidebar. Every system decision, state transition, guardrail evaluation, and mock webhook response is logged chronologically with timestamps and expandable JSON metadata payloads.
          </p>
        </div>
      )
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Search */}
      <div className="bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#FAF5FF] border border-[#DDD6FE]/60 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              RevenueAI Knowledge Base & Guide
            </h2>
            <p className="text-xs text-[#64748B]">
              Comprehensive documentation on autonomous recovery workflows, guardrails, and architecture.
            </p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, guardrails, AI models, or workflows..."
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-11 pr-4 py-3 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 font-medium"
          />
        </div>
      </div>

      {/* Quick Architecture Highlights (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
            <Bot className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">8-Stage AI Decision Pipeline</h4>
          <p className="text-[11px] text-[#64748B]">
            Groq LLM (<code>openai/gpt-oss-120b</code>) with automated heuristic fallback for uninterrupted recovery.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">Zero-Trust Deterministic Safety</h4>
          <p className="text-[11px] text-[#64748B]">
            6+ pre-execution safety policies protecting customer trust, amount integrity, and compliance.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF5FF] text-[#7C3AED]">
            <History className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">Cryptographic Audit Trail</h4>
          <p className="text-[11px] text-[#64748B]">
            Tamper-evident ledger capturing every decision, state transition, and provider webhook event.
          </p>
        </div>
      </div>

      {/* Architecture Deep Dive */}
      <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-6">
        <div>
          <h3 className="text-sm font-extrabold text-[#0F172A]">RevenueAI Architecture & Workflow Guide</h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Key concepts and governance pillars powering intelligent dunning and automated revenue recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Activity className="h-4 w-4 text-[#6366F1]" />
              <span>Recovery Fatigue & Pressure Engine</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Dynamically calculates customer sensitivity based on outreach attempts, interval spacing, and historical churn risk. Prevents relationship degradation by throttling notifications.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Sliders className="h-4 w-4 text-[#7C3AED]" />
              <span>Strategy Simulation & Suitability</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Evaluates all candidate actions (Retry, Send Link, Reminder, Wait, Escalate) against transaction risk and reason codes to determine the optimal recovery path.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Lock className="h-4 w-4 text-[#059669]" />
              <span>Deterministic Guardrail Barrier</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Zero-trust validation layer that overrides AI proposals if consent is missing, max retries are exceeded, or invoice amounts are altered.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Zap className="h-4 w-4 text-[#D97706]" />
              <span>Isolated Execution Layer</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Safe execution environment operating under <code>PAYMENT_PROVIDER=mock</code> and <code>ALLOW_REAL_MONEY_MOVEMENT=false</code> to ensure risk-free demonstrations.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ Accordion List */}
      <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-4">
        <h3 className="text-sm font-extrabold text-[#0F172A]">Frequently Asked Questions</h3>

        <div className="space-y-3 divide-y divide-[#F1F5F9]">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="pt-3 first:pt-0">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between py-2 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#F8FAFC] text-[#64748B] font-mono text-[10px] font-bold px-2 py-0.5 border border-[#ECEEF2]">
                      {faq.category}
                    </span>
                    <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#6366F1] transition-colors">
                      {faq.question}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#6366F1] shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#94A3B8] shrink-0 group-hover:text-[#0F172A]" />
                  )}
                </button>

                {isOpen && (
                  <div className="pt-2 pb-3 px-1">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
