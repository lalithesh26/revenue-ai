import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  RotateCcw, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  Loader2, 
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { SearchItem, SearchResponse } from '../../types';

interface SearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (item: SearchItem) => void;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  query,
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.search(query.trim());
        setResults(data);
      } catch (err: any) {
        setError(err.message || 'Search request failed.');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !query.trim()) return null;

  const totalResults = results?.total_results || 0;

  const getBadgeStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]';
      case 'danger':
        return 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]';
      case 'warning':
        return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
      case 'purple':
        return 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]';
      default:
        return 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl border border-[#ECEEF2] shadow-xl overflow-hidden max-h-96 flex flex-col font-sans"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#ECEEF2] text-[11px] text-[#64748B]">
        <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
          <span>Universal Search</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-[#6366F1]" />}
        </div>
        <span>{totalResults} matches found</span>
      </div>

      <div className="overflow-y-auto p-2 space-y-3 divide-y divide-[#F1F5F9]">
        {loading && !results && (
          <div className="flex items-center justify-center py-8 text-xs text-[#64748B] gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />
            <span>Searching cases, customers, and payments...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-xs text-[#E11D48] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && totalResults === 0 && (
          <div className="text-center py-8 text-xs text-[#94A3B8] space-y-1">
            <div className="font-bold text-[#475569]">No results found for "{query}"</div>
            <div>Try searching by customer name, case ID, or amount.</div>
          </div>
        )}

        {/* 1. Recovery Cases */}
        {results && results.recovery_cases.length > 0 && (
          <div className="pt-2 first:pt-0 space-y-1">
            <div className="px-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3 text-[#6366F1]" />
              <span>Recovery Cases</span>
            </div>
            {results.recovery_cases.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectResult(item)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F8FAFC] text-left transition-colors cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#6366F1] transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#64748B]">{item.subtitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(item.badge_variant)}`}>
                    {item.badge}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#0F172A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 2. Customers */}
        {results && results.customers.length > 0 && (
          <div className="pt-2 first:pt-0 space-y-1">
            <div className="px-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3 w-3 text-[#10B981]" />
              <span>Customers</span>
            </div>
            {results.customers.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectResult(item)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F8FAFC] text-left transition-colors cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#10B981] transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#64748B]">{item.subtitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(item.badge_variant)}`}>
                    {item.badge}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#0F172A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 3. Payments */}
        {results && results.payments.length > 0 && (
          <div className="pt-2 first:pt-0 space-y-1">
            <div className="px-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3 w-3 text-[#8B5CF6]" />
              <span>Payments</span>
            </div>
            {results.payments.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectResult(item)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F8FAFC] text-left transition-colors cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#8B5CF6] transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#64748B]">{item.subtitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(item.badge_variant)}`}>
                    {item.badge}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#0F172A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
