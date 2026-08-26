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
  ArrowRight
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
            When a payment fails, RevenueAI initiates a 5-stage evaluation loop:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-[#334155]">
            <li><strong>Context Collection:</strong> Ingests customer LTV, past payment success rates, subscription tier, and communication consent.</li>
            <li><strong>Strategy Formulation:</strong> The LLM (Groq <code>openai/gpt-oss-120b</code>) analyzes failure telemetry and recommends an optimal action (<code>RETRY</code>, <code>SEND_PAYMENT_LINK</code>, <code>WAIT</code>, etc.).</li>
            <li><strong>Guardrail Verification:</strong> The proposed action must strictly pass all 6 deterministic safety checks.</li>
            <li><strong>Provider Dispatch:</strong> Executes the action via payment provider abstraction.</li>
            <li><strong>Audit Logging:</strong> Appends the full event and metadata to the tamper-evident ledger.</li>
          </ol>
        </div>
      )
    },
    {
      category: 'Safety & Guardrails',
      question: 'What are the 6 Deterministic Guardrails enforced before any action?',
      answer: (
        <div className="space-y-2 text-xs text-[#475569] leading-relaxed">
          <p>
            The Guardrail Engine operates as a zero-trust barrier independent of the AI model:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>1. Customer Consent:</strong> Blocks outreach if <code>consent_status == False</code>.</li>
            <li><strong>2. Retry Velocity Cap:</strong> Enforces $\le 3$ retries and a 4-hour delay between automated attempts.</li>
            <li><strong>3. Idempotency Check:</strong> Halts actions if payment is already recovered or in flight.</li>
            <li><strong>4. Amount Integrity:</strong> Ensures invoice total cannot be modified down to the paisa.</li>
            <li><strong>5. Zero Hallucinated Discounts:</strong> Rejects unauthorized promo codes or deductions.</li>
            <li><strong>6. Real-Money Isolation:</strong> Restricts all prototype/sandbox execution to test mode endpoints.</li>
          </ul>
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
            <li>Click <strong>`Run AI Agent`</strong> on the case to observe the autonomous recommendation and guardrail validation.</li>
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
            In accordance with enterprise fintech standards, all sensitive credentials (such as Groq LLM API keys and database connection strings) are stored purely in server-side environment variables (<code>.env</code>) and are never exposed or rendered in the frontend.
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
            Navigate to the <strong>Audit Trail</strong> tab from the sidebar. Every system decision, state transition, guardrail evaluation, and mock webhook response is logged chronologically with timestamps and expandible JSON metadata payloads.
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

      {/* Quick Topic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
            <Bot className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">AI Decision Engine</h4>
          <p className="text-[11px] text-[#64748B]">
            Groq LLM model inference and intelligent recovery action selection.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">Deterministic Safety</h4>
          <p className="text-[11px] text-[#64748B]">
            6 pre-execution safety policies protecting customers and funds.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#ECEEF2] space-y-2 hover:border-[#CBD5E1] transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF5FF] text-[#7C3AED]">
            <History className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-[#0F172A]">Audit & Compliance</h4>
          <p className="text-[11px] text-[#64748B]">
            Cryptographic ledger capturing every automated event.
          </p>
        </div>
      </div>

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
