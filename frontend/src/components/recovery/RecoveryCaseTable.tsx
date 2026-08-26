import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Search, 
  RotateCcw, 
  Sparkles, 
  ArrowRight, 
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { RecoveryCase } from '../../types';

interface RecoveryCaseTableProps {
  cases: RecoveryCase[];
  onSelectCase: (caseId: string) => void;
  onQuickAnalyze?: (caseId: string) => void;
  onQuickRunAgent?: (caseId: string) => void;
  loading?: boolean;
}

export const RecoveryCaseTable: React.FC<RecoveryCaseTableProps> = ({
  cases,
  onSelectCase,
  onQuickAnalyze,
  onQuickRunAgent,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      !search || 
      (c.customer_name?.toLowerCase().includes(search.toLowerCase())) ||
      (c.customer_email?.toLowerCase().includes(search.toLowerCase())) ||
      (c.id.toLowerCase().includes(search.toLowerCase())) ||
      (c.failure_reason?.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="warning" dot>Open</Badge>;
      case 'in_recovery': return <Badge variant="info" dot>In Recovery</Badge>;
      case 'recovered': return <Badge variant="success" dot>Recovered</Badge>;
      case 'failed_unrecovered': return <Badge variant="danger" dot>Unrecovered</Badge>;
      case 'closed': return <Badge variant="neutral" dot>Closed</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="text-[10px] font-bold uppercase text-[#E11D48] bg-[#FFF1F2] px-2 py-0.5 rounded-full border border-[#FECDD3]">Critical</span>;
      case 'high':
        return <span className="text-[10px] font-bold uppercase text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-full border border-[#FDE68A]">High</span>;
      case 'medium':
        return <span className="text-[10px] font-bold uppercase text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full border border-[#C7D2FE]">Medium</span>;
      default:
        return <span className="text-[10px] font-bold uppercase text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-full border border-[#E2E8F0]">{priority}</span>;
    }
  };

  const getDecisionBadge = (decision?: string) => {
    if (!decision) return <span className="text-[#94A3B8] text-xs italic font-medium">Pending Analysis</span>;
    switch (decision) {
      case 'retry':
        return <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">Smart Retry</span>;
      case 'send_payment_link':
        return <span className="text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-md border border-[#DDD6FE]">Payment Link</span>;
      case 'send_reminder':
        return <span className="text-[11px] font-bold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-md border border-[#FDE68A]">Send Reminder</span>;
      case 'escalate':
        return <span className="text-[11px] font-bold text-[#E11D48] bg-[#FFF1F2] px-2 py-0.5 rounded-md border border-[#FECDD3]">Escalate Ops</span>;
      case 'stop':
        return <span className="text-[11px] font-bold text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">Stop Outreach</span>;
      default:
        return <span className="text-xs text-[#475569]">{decision}</span>;
    }
  };

  return (
    <Card className="overflow-hidden border-[#ECEEF2] bg-white">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-[#F1F5F9] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search customer, case ID, failure reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-1 text-xs shadow-sm">
            <span className="text-[11px] font-semibold text-[#8C98A4] px-2">Status:</span>
            {['all', 'open', 'in_recovery', 'recovered', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-[#6366F1] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-1 text-xs shadow-sm">
            <span className="text-[11px] font-semibold text-[#8C98A4] px-2">Priority:</span>
            {['all', 'critical', 'high', 'medium'].map((pr) => (
              <button
                key={pr}
                onClick={() => setPriorityFilter(pr)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  priorityFilter === pr
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider bg-[#F8FAFC]">
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Failure Reason</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">AI Decision</th>
              <th className="py-3.5 px-4">Confidence</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                  Loading recovery cases...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                  No matching recovery cases found.
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => {
                const initials = (c.customer_name || 'Customer')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr 
                    key={c.id} 
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    onClick={() => onSelectCase(c.id)}
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] font-bold text-xs">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0F172A]">
                            {c.customer_name || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            {c.id.substring(0, 10)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold font-sans text-sm text-[#0F172A]">
                      {formatCurrency(c.revenue_at_risk)}
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="font-medium text-[#475569] truncate block text-xs" title={c.failure_reason}>
                        {c.failure_reason || 'Gateway decline'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      {getPriorityBadge(c.priority)}
                    </td>

                    {/* AI Decision */}
                    <td className="py-3.5 px-4">
                      {getDecisionBadge(c.latest_decision || c.assigned_action)}
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-4">
                      {c.latest_confidence ? (
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-[#10B981] h-full rounded-full" 
                              style={{ width: `${Math.round(c.latest_confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-[#059669] font-bold">
                            {(c.latest_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 'open' && onQuickRunAgent && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickRunAgent(c.id);
                            }}
                            icon={<Zap className="h-3 w-3" />}
                            className="rounded-xl text-[11px] py-1 px-3 shadow-sm font-bold"
                          >
                            Run Agent
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                          }}
                          icon={<ArrowRight className="h-3 w-3 text-[#64748B] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all" />}
                          className="rounded-xl text-[11px] py-1 px-2.5 font-bold"
                        >
                          Workspace
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
        <span>Showing {filteredCases.length} of {cases.length} recovery cases</span>
        <span className="text-[11px] font-mono text-[#8C98A4]">Auto-refreshes on live events</span>
      </div>
    </Card>
  );
};
