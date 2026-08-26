import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#ECEEF2] rounded-3xl shadow-ficopay-card transition-all duration-200 ${
        hoverEffect ? 'hover:shadow-ficopay-hover hover:border-[#D9DFE8] cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
