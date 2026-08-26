import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple' | 'violet' | 'indigo' | 'cyan' | 'amber' | 'coral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    success: 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
    danger: 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]',
    warning: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    info: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
    indigo: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]',
    violet: 'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]',
    purple: 'bg-[#FAF5FF] text-[#8B5CF6] border border-[#E9D5FF]',
    cyan: 'bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC]',
    amber: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
    coral: 'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]', // Remapped from coral
    neutral: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]',
  };

  const dotColors = {
    success: 'bg-[#10B981]',
    danger: 'bg-[#F43F5E]',
    warning: 'bg-[#F59E0B]',
    info: 'bg-[#3B82F6]',
    indigo: 'bg-[#6366F1]',
    violet: 'bg-[#8B5CF6]',
    purple: 'bg-[#A855F7]',
    cyan: 'bg-[#06B6D4]',
    amber: 'bg-[#D97706]',
    coral: 'bg-[#8B5CF6]',
    neutral: 'bg-[#94A3B8]',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold',
    md: 'px-3 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors font-sans ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
