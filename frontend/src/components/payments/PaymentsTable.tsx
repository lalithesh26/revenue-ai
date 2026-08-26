import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Search, CreditCard, RefreshCw, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { Payment } from '../../types';
import { api } from '../../services/api';

interface PaymentsTableProps {
  onOpenRecoveryCase?: (paymentId: string) => void;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({ onOpenRecoveryCase }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPayments({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      });
      setPayments(data);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const filtered = payments.filter(p => 
    !search || 
    p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.failure_reason?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded': return <Badge variant="success" dot>Succeeded</Badge>;
      case 'recovered': return <Badge variant="success" dot>Recovered</Badge>;
      case 'failed': return <Badge variant="danger" dot>Failed</Badge>;
      case 'pending': return <Badge variant="warning" dot>Pending</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#6366F1]" />
            Payments Ledger
          </h2>
          <p className="text-xs text-[#64748B]">Unified ledger of all successful, failed, and recovered transactions</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          className="rounded-xl"
        >
          Refresh Ledger
        </Button>
      </div>

      <Card className="overflow-hidden border-[#ECEEF2] bg-white">
        <div className="p-5 border-b border-[#F1F5F9] flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search payments by ID, customer, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-1 text-xs shadow-sm">
            <span className="text-[11px] font-semibold text-[#8C98A4] px-2">Filter:</span>
            {['all', 'failed', 'recovered', 'succeeded'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-[#6366F1] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider bg-[#F8FAFC]">
                <th className="py-3.5 px-4">Payment ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Gateway Status</th>
                <th className="py-3.5 px-4">Failure Reason</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    No payments found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const initials = (p.customer_name || 'Customer')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">
                        {p.id}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] font-bold text-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#0F172A]">{p.customer_name || 'Customer'}</span>
                            <span className="text-[10px] text-[#94A3B8]">{p.customer_email || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold font-sans text-sm text-[#0F172A]">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] uppercase bg-[#F8FAFC] px-2.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#475569]">
                          {p.payment_method.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(p.status)}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-[#475569] max-w-[220px]">
                        <span className="truncate block" title={p.failure_reason}>
                          {p.failure_reason || '—'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-right font-mono text-[#8C98A4] text-[11px]">
                        {new Date(p.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-white border-t border-[#F1F5F9] text-xs text-[#64748B]">
          Showing {filtered.length} of {payments.length} total payment records
        </div>
      </Card>
    </div>
  );
};
