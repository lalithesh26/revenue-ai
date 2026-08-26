import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem, NotificationListResponse } from '../../types';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onToggle,
  onClose
}) => {
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setData(res);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

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

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          unread_count: Math.max(0, prev.unread_count - 1),
          notifications: prev.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
        };
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          unread_count: 0,
          notifications: prev.notifications.map(n => ({ ...n, is_read: true }))
        };
      });
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <ShieldAlert className="h-4 w-4 text-[#E11D48]" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-[#059669]" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-[#D97706]" />;
      default:
        return <Info className="h-4 w-4 text-[#6366F1]" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unreadCount = data?.unread_count || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        type="button"
        onClick={onToggle}
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1] shadow-sm transition-all cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#8B5CF6] text-[9px] font-extrabold text-white px-1 shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white rounded-3xl border border-[#ECEEF2] shadow-xl overflow-hidden flex flex-col font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#0F172A]">System Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#F5F3FF] text-[#7C3AED] font-mono text-[10px] font-bold px-2 py-0.5 border border-[#DDD6FE]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-[#6366F1] hover:text-[#4F46E5] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-80 divide-y divide-[#F1F5F9] p-2">
            {loading && !data && (
              <div className="flex items-center justify-center py-8 text-xs text-[#64748B] gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />
                <span>Loading notifications...</span>
              </div>
            )}

            {data && data.notifications.length === 0 && (
              <div className="text-center py-8 text-xs text-[#94A3B8] space-y-1">
                <CheckCircle2 className="h-6 w-6 text-[#10B981] mx-auto" />
                <div className="font-bold text-[#475569]">All caught up!</div>
                <div>No pending system alerts.</div>
              </div>
            )}

            {data && data.notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl transition-all flex items-start justify-between gap-3 ${
                  n.is_read ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#FAF5FF]/60 border border-[#DDD6FE]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-white shadow-xs border border-[#ECEEF2] mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#0F172A] leading-snug">
                      {n.title}
                    </div>
                    <div className="text-[11px] text-[#64748B] leading-relaxed">
                      {n.message}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] font-medium pt-1">
                      {formatTimeAgo(n.created_at)}
                    </div>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => handleMarkRead(n.id, e)}
                    title="Mark as read"
                    className="p-1 rounded-lg text-[#94A3B8] hover:text-[#6366F1] hover:bg-white transition-colors cursor-pointer shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
