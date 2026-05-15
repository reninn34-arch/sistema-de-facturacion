import React from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'slate' | 'sky' | 'purple';
  icon?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const colorMap: Record<string, { text: string; bg: string }> = {
  indigo: { text: 'text-sky-600 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/10' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  rose: { text: 'text-rose-600 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  amber: { text: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  blue: { text: 'text-sky-600 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/10' },
  slate: { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  sky: { text: 'text-sky-600 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-500/10' },
  purple: { text: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-500/10' },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, color = 'indigo', icon, onClick, loading = false }) => {
  const c = colorMap[color] || colorMap.indigo;

  return (
    <Card hover={!!onClick} onClick={onClick} padding="lg">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
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
