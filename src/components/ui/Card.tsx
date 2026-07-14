import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingMap = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

const Card: React.FC<CardProps> = ({ children, className = '', hover = false, padding = 'md', onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      className={`
        bg-white dark:bg-slate-800
        rounded-xl
        shadow-sm dark:shadow-lg dark:shadow-black/10
        border border-slate-200 dark:border-slate-700/50
        ${paddingMap[padding]}
        ${hover ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 dark:hover:shadow-black/20' : ''}
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
