import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ActiveTab } from './components/layout/Sidebar';
import { SignInPage } from './components/auth/SignInPage';
import { SettingsView } from './components/settings/SettingsView';
import { HelpCenterView } from './components/help/HelpCenterView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { PrimaryRecoveryCard } from './components/dashboard/PrimaryRecoveryCard';
import { AIAgentStatusCard } from './components/dashboard/AIAgentStatusCard';
import { AIInsightsCard } from './components/dashboard/AIInsightsCard';
import { QuickActionsCard } from './components/dashboard/QuickActionsCard';
import { DemoScenariosCard } from './components/dashboard/DemoScenariosCard';
import { RecoveryTrendCard } from './components/dashboard/RecoveryTrendCard';
import { RecoveryPerformanceDonut } from './components/dashboard/RecoveryPerformanceDonut';
import { RecoveryHealthCard } from './components/dashboard/RecoveryHealthCard';
import { RecentRecoveryActivityTable } from './components/dashboard/RecentRecoveryActivityTable';

import { AgentActivityFeed } from './components/dashboard/AgentActivityFeed';
import { RecoveryCaseTable } from './components/recovery/RecoveryCaseTable';
import { RecoveryCaseDetailModal } from './components/recovery/RecoveryCaseDetailModal';
import { AuditTimeline } from './components/recovery/AuditTimeline';
import { PaymentsTable } from './components/payments/PaymentsTable';
import { CustomersTable } from './components/customers/CustomersTable';
import { GuardrailsOverview } from './components/guardrails/GuardrailsOverview';
import { DashboardSummary, RecoveryCase, SearchItem, User } from './types';
import { api, authStorage } from './services/api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(authStorage.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!authStorage.getToken());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Validate session on load
  useEffect(() => {
    const token = authStorage.getToken();
    if (token) {
      api.getMe()
        .then((user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          loadData();
        })
        .catch(() => {
          // Expired or invalid token
          authStorage.clear();
          setCurrentUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, casesData] = await Promise.all([
        api.getDashboardSummary(),
        api.getRecoveryCases()
      ]);
      setSummary(sumData);
      setCases(casesData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    loadData();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const handleSimulateFailure = async () => {
    try {
      setActionLoading(true);
      await api.simulateFailure();
      await loadData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReseedData = async () => {
    if (!confirm('Reset entire fintech demo dataset to fresh state?')) return;
    try {
      setActionLoading(true);
      await api.seedDemoData(100, 300, true);
      await loadData();
      alert('Fintech dataset successfully reset.');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenFirstCase = () => {
    const openCase = cases.find(c => c.status === 'open') || cases[0];
    if (openCase) {
      setSelectedCaseId(openCase.id);
    } else {
      alert('No active recovery cases found. Click "Simulate Failure" to generate one.');
    }
  };

  const handleNavigateNextCase = () => {
    const remainingOpen = cases.filter(
      c => c.id !== selectedCaseId && (c.status === 'open' || c.status === 'in_recovery')
    );
    if (remainingOpen.length > 0) {
      setSelectedCaseId(remainingOpen[0].id);
    } else {
      setSelectedCaseId(null);
      alert('All active recovery cases have been evaluated!');
    }
  };

  const handleSelectSearchResult = (item: SearchItem) => {
    if (item.type === 'recovery-cases') {
      setSelectedCaseId(item.target_id);
    } else if (item.type === 'customers') {
      setActiveTab('customers');
    } else if (item.type === 'payments') {
      setActiveTab('payments');
    }
  };

  // If unauthenticated, show professional Sign In page
  if (!isAuthenticated) {
    return <SignInPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      openCasesCount={summary?.open_recovery_cases_count || 0}
      onRefresh={loadData}
      onSimulateFailure={handleSimulateFailure}
      onReseedData={handleReseedData}
      loading={loading || actionLoading}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onSelectSearchResult={handleSelectSearchResult}
      user={currentUser}
      onLogout={handleLogout}
    >
      {/* 1. OVERVIEW / DASHBOARD TAB - FicoPay Hierarchy */}
      {activeTab === 'dashboard' && summary && (
        <div className="space-y-6">
          {/* ROW 1 (TOP 3 CARDS): Primary Recovery Card + AI Agent Card + AI Insights Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Col 1: Primary Recovery Card (Total Balance equivalent - 5 cols) */}
            <div className="lg:col-span-5">
              <PrimaryRecoveryCard summary={summary} />
            </div>

            {/* Col 2: AI Agent Status Card (My Cards equivalent - 3.5 cols) */}
            <div className="lg:col-span-3.5 lg:col-span-3">
              <AIAgentStatusCard />
            </div>

            {/* Col 3: AI Recovery Insights Card (AI Insights equivalent - 3.5 cols) */}
            <div className="lg:col-span-3.5 lg:col-span-4">
              <AIInsightsCard
                summary={summary}
                onViewMore={() => setActiveTab('recovery-cases')}
              />
            </div>
          </div>

          {/* CONTROLLED AI DEMO SCENARIOS LAUNCHER */}
          <DemoScenariosCard
            onOpenCaseModal={(id) => setSelectedCaseId(id)}
            onRefreshData={loadData}
          />

          {/* ROW 2: Bottom Section (Quick Actions + Trend Chart / Performance Donut + Recent Activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sub-Column (7 cols): Quick Actions + Recovery Trend */}
            <div className="lg:col-span-7 space-y-6">
              <QuickActionsCard
                onRunAIAgent={handleOpenFirstCase}
                onViewHighPriority={() => setActiveTab('recovery-cases')}
                onSimulateFailure={handleSimulateFailure}
                onViewAnalytics={() => setActiveTab('analytics')}
              />

              <RecoveryTrendCard summary={summary} />
            </div>

            {/* Right Sub-Column (5 cols): Recovery Performance Donut + Recovery Health + Recent Recovery Activity */}
            <div className="lg:col-span-5 space-y-6">
              <RecoveryPerformanceDonut summary={summary} />

              <RecoveryHealthCard summary={summary} />

              <RecentRecoveryActivityTable
                cases={cases}
                onSelectCase={(id) => setSelectedCaseId(id)}
                onViewAllCases={() => setActiveTab('recovery-cases')}
              />
            </div>

          </div>
        </div>
      )}

      {/* 2. RECOVERY CASES TAB */}
      {activeTab === 'recovery-cases' && (
        <div className="space-y-4">
          <RecoveryCaseTable
            cases={cases}
            onSelectCase={(id) => setSelectedCaseId(id)}
            onQuickRunAgent={(id) => setSelectedCaseId(id)}
            loading={loading}
          />
        </div>
      )}

      {/* 3. PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <PaymentsTable onOpenRecoveryCase={(id) => setSelectedCaseId(id)} />
      )}

      {/* 4. CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <CustomersTable />
      )}

      {/* 5. ANALYTICS TAB - Full Audit View */}
      {activeTab === 'analytics' && (
        <AnalyticsView
          summary={summary}
          loading={loading}
          onRefresh={loadData}
        />
      )}

      {/* 6. AI RECOVERY AGENT / CONSOLE TAB */}
      {activeTab === 'ai-agent' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <AIAgentStatusCard />
            </div>
            <div className="lg:col-span-6">
              <AIInsightsCard
                summary={summary}
                onViewMore={() => setActiveTab('recovery-cases')}
              />
            </div>
          </div>
          <RecoveryCaseTable
            cases={cases}
            onSelectCase={(id) => setSelectedCaseId(id)}
            onQuickRunAgent={(id) => setSelectedCaseId(id)}
            loading={loading}
          />
        </div>
      )}

      {/* 7. AGENT ACTIVITY TAB */}
      {activeTab === 'agent-activity' && (
        <AgentActivityFeed
          cases={cases}
          recentDecisions={summary?.recent_agent_decisions || []}
          onSelectCase={(id) => setSelectedCaseId(id)}
        />
      )}

      {/* 8. SAFETY & GUARDRAILS TAB */}
      {activeTab === 'guardrails' && (
        <GuardrailsOverview />
      )}

      {/* 9. AUDIT TRAIL TAB */}
      {activeTab === 'audit-trail' && summary && (
        <AuditTimeline logs={summary.recent_audit_logs || []} />
      )}

      {/* 10. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <SettingsView
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 11. HELP CENTER TAB */}
      {activeTab === 'help' && (
        <HelpCenterView />
      )}

      {/* Case Detail & Execution Modal */}
      {selectedCaseId && (
        <RecoveryCaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRefreshParent={loadData}
          onNavigateNextCase={handleNavigateNextCase}
        />
      )}
    </Layout>
  );
};

export default App;
