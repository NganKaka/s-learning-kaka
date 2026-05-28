import { useState } from 'react';
import { Play, StickyNote, Sparkles, MessageCircle } from 'lucide-react';

const TABS = [
  { key: 'video', label: 'Video', icon: Play },
  { key: 'notes', label: 'Ghi chú', icon: StickyNote },
  { key: 'quiz', label: 'Quiz', icon: Sparkles },
  { key: 'discuss', label: 'Thảo luận', icon: MessageCircle },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Mobile tab bar for the Learn page. Renders below the video on small screens.
 * Parent renders content based on activeTab.
 */
export default function MobileLearnTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="md:hidden sticky top-[88px] z-30 bg-background/80 backdrop-blur-md border-b border-white/5">
      <div className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-primary border-b-2 border-primary' : 'text-secondary/55'
              }`}
            >
              <Icon size={14} />
              <span className="font-tech text-[8px] uppercase tracking-[0.14em]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { TabKey };
