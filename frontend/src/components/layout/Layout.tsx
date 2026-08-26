import React from 'react';
import { Header } from './Header';
import { Sidebar, ActiveTab } from './Sidebar';
import { SearchItem, User } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  openCasesCount: number;
  onRefresh: () => void;
  onSimulateFailure: () => void;
  onReseedData: () => void;
  loading: boolean;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  onSelectSearchResult: (item: SearchItem) => void;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  openCasesCount,
  onRefresh,
  onSimulateFailure,
  onReseedData,
  loading,
  searchTerm = '',
  onSearchChange,
  onSelectSearchResult,
  user,
  onLogout,
}) => {
  const getTabTitles = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'AI-powered intelligence for recovering failed payments.' };
      case 'recovery-cases':
        return { title: 'Recovery Cases', subtitle: 'Manage, evaluate, and resolve active transaction drop-offs.' };
      case 'payments':
        return { title: 'Payments History', subtitle: 'Unified ledger of all successful, failed, and recovered transactions.' };
      case 'customers':
        return { title: 'Customer Profiles', subtitle: 'Contextual subscription LTV, payment reliability, and consent status.' };
      case 'analytics':
        return { title: 'Recovery Analytics', subtitle: 'Multi-dimensional recovery metrics, channel health, and drop-off trends.' };
      case 'ai-agent':
        return { title: 'AI Recovery Agent', subtitle: 'Autonomous decisioning engine powered by Groq GPT-OSS-120B with safety guardrails.' };
      case 'agent-activity':
        return { title: 'Agent Activity', subtitle: 'Live execution feed of contextual AI decisions and deterministic actions.' };
      case 'guardrails':
        return { title: 'Safety & Guardrails', subtitle: '6 deterministic policies ensuring 100% compliant and isolated recovery.' };
      case 'audit-trail':
        return { title: 'Audit Trail', subtitle: 'Chronological database audit trail for financial governance and compliance.' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Platform configuration, AI models, preferences, and session controls.' };
      case 'help':
        return { title: 'Help Center', subtitle: 'Comprehensive knowledgebase, workflow guides, and architecture references.' };
      default:
        return { title: 'Dashboard', subtitle: 'AI-powered intelligence for recovering failed payments.' };
    }
  };

  const { title, subtitle } = getTabTitles(activeTab);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      {/* Compact Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        openCasesCount={openCasesCount}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          onSimulateFailure={onSimulateFailure}
          onReseedData={onReseedData}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onSelectSearchResult={onSelectSearchResult}
          user={user}
          onLogout={onLogout}
          onOpenSettings={() => onSelectTab('settings')}
        />
        <main className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
