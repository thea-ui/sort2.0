import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { CalendarDays, Leaf, Wrench, Megaphone, ChevronRight } from 'lucide-react';

const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; bg: string; text: string; border: string; label: string }
> = {
  COLLECTION: { icon: Leaf,      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Collection' },
  MAINTENANCE: { icon: Wrench,   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   label: 'Maintenance' },
  EVENT:       { icon: Megaphone, bg: 'bg-[var(--gold)]/10',  text: 'text-[var(--gold)]',  border: 'border-[var(--gold)]/25',  label: 'Event' },
};

export const CampaignsFeed: React.FC = () => {
  const { calendarEvents } = useMockData();
  const events = calendarEvents.slice(0, 3);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={14} className="text-emerald-600" strokeWidth={2} />
          <h3 className="text-xs font-bold text-gray-800">Upcoming Eco Campaigns</h3>
        </div>
        <button className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-700">
          View all <ChevronRight size={11} />
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 divide-y divide-gray-50">
        {events.map((ev) => {
          const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.COLLECTION;
          const Icon = cfg.icon;
          const dateObj = new Date(ev.date);
          const day = dateObj.getDate();
          const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

          return (
            <div key={ev.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50">
              {/* Date block */}
              <div className="flex w-10 shrink-0 flex-col items-center rounded-lg border border-gray-200 bg-white py-1.5 text-center shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{month}</span>
                <span className="text-lg font-black leading-none text-gray-900">{day}</span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="mb-1">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <Icon size={9} strokeWidth={2.5} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-gray-800">{ev.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                  {ev.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
