import React from 'react';
import { 
  LayoutDashboard, 
  RotateCcw, 
  CreditCard, 
  Users, 
  ShieldCheck, 
  Bot, 
  Sparkles, 
  LineChart, 
  History, 
  Settings, 
  HelpCircle, 
  ChevronDown,
  Activity,
  Zap,
  Lock,
  Layers,
  LogOut
} from 'lucide-react';
import { User } from '../../types';

export type ActiveTab = 
  | 'dashboard' 
  | 'recovery-cases' 
  | 'payments' 
  | 'customers' 
  | 'analytics' 
  | 'ai-agent' 
  | 'agent-activity' 
  | 'guardrails' 
  | 'audit-trail'
  | 'settings'
  | 'help';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  openCasesCount?: number;
  user: User | null;
  onLogout: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  openCasesCount = 0,
  user,
  onLogout,
  onCloseMobile
}) => {
  const userName = user?.name || 'Alex Morgan';
  const userEmail = user?.email || 'demo@revenueai.app';

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-[#ECEEF2] flex flex-col justify-between p-4 pl-5 select-none h-full overflow-y-auto font-sans shadow-lg lg:shadow-none">
      <div className="space-y-6">
        {/* RevenueAI Brand Header with Mobile Close Button */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] via-[#7C3AED] to-[#A855F7] shadow-md shadow-indigo-500/20 text-white">
              <span className="font-extrabold text-lg tracking-tight">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-[#0F172A] leading-tight flex items-center gap-1">
                RevenueAI
              </span>
              <span className="text-[10px] font-semibold text-[#8B5CF6] tracking-wider uppercase">
                AI Revenue Recovery
              </span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-5">
          {/* MAIN MENU */}
          <div>
            <div className="px-3 text-[11px] font-bold text-[#94A3B8] mb-1.5 tracking-normal">
              Main Menu
            </div>
            <nav className="space-y-1">
              <NavItem
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                active={activeTab === 'dashboard'}
                onClick={() => onSelectTab('dashboard')}
              />
              <NavItem
                icon={<RotateCcw className="h-4 w-4" />}
                label="Recovery Cases"
                active={activeTab === 'recovery-cases'}
                onClick={() => onSelectTab('recovery-cases')}
                badge={openCasesCount > 0 ? `${openCasesCount}` : undefined}
              />
              <NavItem
                icon={<CreditCard className="h-4 w-4" />}
                label="Payments"
                active={activeTab === 'payments'}
                onClick={() => onSelectTab('payments')}
              />
              <NavItem
                icon={<Users className="h-4 w-4" />}
                label="Customers"
                active={activeTab === 'customers'}
                onClick={() => onSelectTab('customers')}
              />
              <NavItem
                icon={<LineChart className="h-4 w-4" />}
                label="Analytics"
                active={activeTab === 'analytics'}
                onClick={() => onSelectTab('analytics')}
              />
            </nav>
          </div>

          {/* AI ENGINE */}
          <div>
            <div className="px-3 text-[11px] font-bold text-[#94A3B8] mb-1.5 flex items-center justify-between">
              <span>AI Engine</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] animate-pulse"></span>
            </div>
            <nav className="space-y-1">
              <NavItem
                icon={<Bot className="h-4 w-4" />}
                label="AI Recovery Agent"
                active={activeTab === 'ai-agent'}
                onClick={() => onSelectTab('ai-agent')}
                accentDot
              />
              <NavItem
                icon={<Activity className="h-4 w-4" />}
                label="Agent Activity"
                active={activeTab === 'agent-activity'}
                onClick={() => onSelectTab('agent-activity')}
              />
            </nav>
          </div>

          {/* SECURITY & GOVERNANCE */}
          <div>
            <div className="px-3 text-[11px] font-bold text-[#94A3B8] mb-1.5">
              Security
            </div>
            <nav className="space-y-1">
              <NavItem
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Safety & Guardrails"
                active={activeTab === 'guardrails'}
                onClick={() => onSelectTab('guardrails')}
              />
              <NavItem
                icon={<History className="h-4 w-4" />}
                label="Audit Trail"
                active={activeTab === 'audit-trail'}
                onClick={() => onSelectTab('audit-trail')}
              />
            </nav>
          </div>

          {/* GENERAL & SETTINGS */}
          <div>
            <div className="px-3 text-[11px] font-bold text-[#94A3B8] mb-1.5">
              General
            </div>
            <nav className="space-y-1">
              <NavItem
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
                active={activeTab === 'settings'}
                onClick={() => onSelectTab('settings')}
              />
              <NavItem
                icon={<HelpCircle className="h-4 w-4" />}
                label="Help Center"
                active={activeTab === 'help'}
                onClick={() => onSelectTab('help')}
              />
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Status & Profile Cards */}
      <div className="pt-4 space-y-3">
        {/* AI Agent Status Pill */}
        <div className="rounded-2xl border border-[#ECEEF2] bg-[#F8FAFC] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className="text-xs font-bold text-[#0F172A]">AI Agent Online</span>
            </div>
            <span className="rounded-full bg-[#F5F3FF] text-[#7C3AED] font-mono text-[9px] font-bold px-2 py-0.5 border border-[#DDD6FE]">
              REAL_LLM
            </span>
          </div>
          
          <div className="text-[11px] font-medium text-[#64748B] flex items-center justify-between">
            <span>Provider:</span>
            <span className="font-mono text-[#0F172A] font-semibold">Groq · GPT-OSS-120B</span>
          </div>
        </div>

        {/* User Profile Card with Settings / Logout */}
        <div 
          onClick={() => onSelectTab('settings')}
          className="flex items-center justify-between rounded-2xl border border-[#ECEEF2] bg-white p-2.5 shadow-sm hover:border-[#CBD5E1] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white font-bold text-xs shadow-sm">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="text-xs font-bold text-[#0F172A] leading-tight truncate group-hover:text-[#6366F1] transition-colors">{userName}</span>
              <span className="text-[10px] text-[#64748B] leading-tight truncate font-mono">{userEmail}</span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  accentDot?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active,
  onClick,
  badge,
  accentDot,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#FAF5FF] text-[#6D28D9] font-bold shadow-sm border border-[#DDD6FE]/60'
          : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] font-medium'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={active ? 'text-[#7C3AED]' : 'text-[#64748B]'}>{icon}</span>
        <span>{label}</span>
        {accentDot && !active && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
        )}
      </div>

      {badge && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
