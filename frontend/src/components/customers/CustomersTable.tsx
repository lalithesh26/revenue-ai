import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Search, Users, RefreshCw, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../services/api';

export const CustomersTable: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#6366F1]" />
            Customer Profiles & Reliability
          </h2>
          <p className="text-xs text-[#64748B]">Contextual subscriber profiles, lifetime value, and communication consent</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCustomers}
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          className="rounded-xl"
        >
          Refresh Customers
        </Button>
      </div>

      <Card className="overflow-hidden border-[#ECEEF2] bg-white">
        <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between bg-white">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search customer name, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <span className="text-xs font-semibold text-[#64748B]">
            {filtered.length} active customer profiles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider bg-[#F8FAFC]">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Customer ID</th>
                <th className="py-3.5 px-4">Lifetime Spend (LTV)</th>
                <th className="py-3.5 px-4">Orders (Success / Fail)</th>
                <th className="py-3.5 px-4">Consent Status</th>
                <th className="py-3.5 px-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    Loading customer directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const initials = c.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] font-bold text-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#0F172A]">{c.name}</span>
                            <span className="text-[10px] text-[#94A3B8]">{c.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        {c.id}
                      </td>

                      {/* LTV */}
                      <td className="py-3.5 px-4 font-bold font-sans text-sm text-[#059669]">
                        {formatCurrency(c.total_spend || 0)}
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#0F172A]">{c.payments_count || 0} total</span>
                          <span className="text-[#8C98A4]">·</span>
                          <span className="text-[#059669] font-semibold">{c.recovered_count || 0} recovered</span>
                        </div>
                      </td>

                      {/* Consent */}
                      <td className="py-3.5 px-4">
                        <Badge variant={c.consent_status ? 'success' : 'danger'} dot>
                          {c.consent_status ? 'Opt-In' : 'Revoked'}
                        </Badge>
                      </td>

                      {/* Risk */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-[#0F172A]">
                        {(c.risk_score || 0.1).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
