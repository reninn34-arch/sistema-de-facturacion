import React from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';
  icon?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const colorMap = {
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20' },
  amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
  blue: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, color = 'indigo', icon, onClick, loading = false }) => {
  const c = colorMap[color];

  return (
    <Card hover={!!onClick} onClick={onClick} padding="lg">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          {label}
        </span>
        {icon && (
          <span className={`w-9 h-9 ${c.bg} ${c.text} rounded-xl flex items-center justify-center text-lg`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        ) : (
          <span className={`text-3xl font-bold ${color === 'rose' ? c.text : 'text-slate-800 dark:text-white'}`}>
            {value}
          </span>
        )}
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase">{subtitle}</p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
