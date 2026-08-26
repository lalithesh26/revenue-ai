import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline' | 'purple' | 'soft' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white shadow-sm shadow-indigo-500/25 font-semibold active:scale-[0.98]',
    purple: 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white shadow-sm shadow-purple-500/25 font-semibold active:scale-[0.98]',
    soft: 'bg-gradient-to-r from-[#F5F3FF] via-[#EEF2FF] to-[#FAF5FF] hover:from-[#EDE9FE] hover:to-[#E0E7FF] text-[#6D28D9] border border-[#DDD6FE]/60 font-semibold shadow-sm active:scale-[0.98]',
    secondary: 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-semibold border border-[#E2E8F0]',
    danger: 'bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-sm shadow-rose-500/20 font-semibold',
    success: 'bg-[#10B981] hover:bg-[#059669] text-white shadow-sm shadow-emerald-500/20 font-semibold',
    outline: 'bg-white hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] font-medium shadow-sm',
    ghost: 'bg-transparent hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] font-medium',
    coral: 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white shadow-sm shadow-indigo-500/25 font-semibold active:scale-[0.98]', // Alias for backward compat
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold rounded-2xl gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-2xl gap-2.5',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
