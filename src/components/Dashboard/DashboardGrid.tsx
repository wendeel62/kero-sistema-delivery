import React from 'react';

interface DashboardGridProps {
  children?: React.ReactNode;
}

export function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <div className="dashboard-grid">
      {children}
    </div>
  );
}