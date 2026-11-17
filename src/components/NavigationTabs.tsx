import React from 'react';

export type ActiveTab = 'services' | 'complaints' | 'directory' | 'scorecard';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  pendingCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  pendingCount = 0,
}) => {
  const tabs = [
    { id: 'services' as ActiveTab, label: 'Civic Hub', desc: 'Report & Actions' },
    { id: 'complaints' as ActiveTab, label: 'Track Ticket', desc: '5-Stage Lifecycle', badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'directory' as ActiveTab, label: 'Helpline Directory', desc: '170 Districts & Pan-India' },
    { id: 'scorecard' as ActiveTab, label: 'SLA Scorecard', desc: 'Open Civic Data' },
  ];

  return (
    <nav
      aria-label="Application Sections"
      className="bg-white border-b border-stitch-surface-border sticky top-[69px] sm:top-[77px] z-30 shadow-stitch-sm"
    >
      <div className="max-w-7xl mx-auto px-4 flex justify-between sm:justify-start gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`min-h-touch py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center gap-1 sm:gap-2 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-stitch-terracotta text-stitch-navy'
                  : 'border-transparent text-stitch-ink-muted hover:text-stitch-ink-primary hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-stitch-pill bg-stitch-terracotta text-white text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="hidden md:inline-block text-[11px] font-normal text-slate-400">
                ({tab.desc})
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

