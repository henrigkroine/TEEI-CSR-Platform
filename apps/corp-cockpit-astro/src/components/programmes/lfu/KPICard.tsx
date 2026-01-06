import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon }) => {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="label mb-2">{title}</p>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-primary-light/10 flex items-center justify-center text-2xl text-[var(--color-primary)]">
        {icon}
      </div>
    </div>
  );
};
