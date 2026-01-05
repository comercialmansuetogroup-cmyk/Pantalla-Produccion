import React from 'react';
import { ClientGroup, VisualSettings } from '../types';
import { ClientColumn } from './ClientColumn';

interface LiveDashboardProps {
  data: ClientGroup[];
  darkMode: boolean;
  settings: VisualSettings;
  highlightedCode: string | null;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({ data, darkMode, settings, highlightedCode }) => {
  return (
    <div className="h-full">
      <div className={`
        grid gap-6 h-full items-start
        grid-cols-1 
        md:grid-cols-2 
        lg:grid-cols-3 
        2xl:grid-cols-4
        3xl:grid-cols-5
      `}>
        {data.map((clientGroup) => (
          /* Fix: Changed prop 'data' to 'group' to match ClientColumn's expected interface */
          <ClientColumn 
            key={clientGroup.clientId || clientGroup.name} 
            group={clientGroup} 
            darkMode={darkMode}
            settings={settings}
            highlightedCode={highlightedCode}
          />
        ))}
      </div>
    </div>
  );
};