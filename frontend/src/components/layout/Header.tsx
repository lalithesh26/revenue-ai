import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  RefreshCw, 
  RotateCcw, 
  Share2,
  User as UserIcon,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  Menu
} from 'lucide-react';
import { SearchDropdown } from '../search/SearchDropdown';
import { NotificationsDropdown } from '../notifications/NotificationsDropdown';
import { SearchItem, User } from '../../types';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh: () => void;
  onSimulateFailure: () => void;
  onReseedData: () => void;
  loading: boolean;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  onSelectSearchResult: (item: SearchItem) => void;
  user: User | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Dashboard",
  subtitle = "AI-powered intelligence for recovering failed payments.",
  onRefresh,
  onSimulateFailure,
  onReseedData,
  loading,
  searchTerm = '',
  onSearchChange,
  onSelectSearchResult,
  user,
  onLogout,
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleSearchInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    }
    setIsSearchOpen(val.trim().length > 0);
  };

  const handleSelectSearchItem = (item: SearchItem) => {
    setIsSearchOpen(false);
    onSelectSearchResult(item);
  };

  const userName = user?.name || 'Alex Morgan';
  const userEmail = user?.email || 'demo@revenueai.app';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-[#F8FAFC]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 border-b border-[#ECEEF2] select-none font-sans">
      {/* Mobile Hamburger Button + Title & Subtitle */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-xs"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}

        <div className="flex flex-col">
          <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#0F172A] leading-tight flex items-center gap-2">
            <span>{title}</span>
          </h1>
          <p className="text-xs font-normal text-[#64748B] mt-0.5 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Search + Actions + Notifications + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Universal Search Bar with Dropdown */}
        <div className="relative w-48 sm:w-64 md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search cases, customers..."
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => {
              if (searchTerm.trim().length > 0) setIsSearchOpen(true);
            }}
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
          />

          <SearchDropdown
            query={searchTerm}
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectResult={handleSelectSearchItem}
          />
        </div>

        {/* Quick Simulate Failure Button */}
        <button
          onClick={onSimulateFailure}
          disabled={loading}
          title="Simulate Gateway Failure (Generates Real Recovery Case)"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white shadow-sm shadow-indigo-500/25 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Notification Bell Dropdown */}
        <NotificationsDropdown
          isOpen={isNotifOpen}
          onToggle={() => {
            setIsNotifOpen(!isNotifOpen);
            setIsUserMenuOpen(false);
          }}
          onClose={() => setIsNotifOpen(false)}
        />

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert('RevenueAI dashboard link copied to clipboard.');
          }}
          title="Share Dashboard Overview"
          className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] hover:text-[#0F172A] hover:border-[#CBD5E1] shadow-sm transition-all cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5 text-[#64748B]" />
          <span>Share</span>
        </button>

        {/* Refresh & Reset Controls */}
        <div className="flex items-center gap-1.5 border-l border-[#E2E8F0] pl-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Live Metrics"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1] shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#6366F1]' : ''}`} />
          </button>

          <button
            onClick={onReseedData}
            disabled={loading}
            title="Reset Fintech Dataset"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1] shadow-sm transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Header User Profile Menu */}
        <div className="relative border-l border-[#E2E8F0] pl-2.5" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 h-9 p-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] shadow-sm transition-all cursor-pointer"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white font-bold text-[10px]">
              {userName.charAt(0)}
            </div>
            <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white rounded-2xl border border-[#ECEEF2] shadow-xl overflow-hidden p-1.5 space-y-1">
              <div className="px-3 py-2 border-b border-[#F1F5F9] space-y-0.5">
                <div className="text-xs font-bold text-[#0F172A] truncate">{userName}</div>
                <div className="text-[10px] text-[#64748B] font-mono truncate">{userEmail}</div>
              </div>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer text-left"
              >
                <Settings className="h-3.5 w-3.5 text-[#64748B]" />
                <span>Settings & Profile</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#E11D48] hover:bg-[#FFF1F2] transition-colors cursor-pointer text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
