import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { apiService } from '../../services/api';

interface CampusNewsItem {
  id: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
  iconColor: string;
  isPublished: boolean;
  createdAt: string;
}

interface CampusNewsCardProps {
  className?: string;
}

const FALLBACK_ICON_COLOR = 'bg-[var(--accent)]';

/**
 * Published campus news, managed from the Admin console. Shared by the
 * student and faculty dashboards so both portals show the same live feed.
 */
export const CampusNewsCard: React.FC<CampusNewsCardProps> = ({ className = '' }) => {
  const [news, setNews] = useState<CampusNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getCampusNews()
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setNews(data.filter((item: CampusNewsItem) => item.isPublished));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (news.length === 0) return null;

  return (
    <section className={`rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2.5">
        <Newspaper size={18} className="text-[var(--primary)]" />
        <h3 className="text-[15px] font-extrabold tracking-tight text-[var(--text-strong)]">Campus News</h3>
      </div>

      <div className="mt-1">
        {news.map((item) => (
          <article key={item.id} className="flex items-start gap-4 py-3.5 first:pt-2 last:pb-1">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${item.iconColor || FALLBACK_ICON_COLOR}`}
            >
              <Newspaper size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-[13.5px] font-bold leading-snug text-[var(--text-strong)]">{item.title}</h4>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-[var(--text-strong)]/55">
                {item.body}
              </p>
              <time
                dateTime={item.createdAt}
                className="mt-1.5 block text-[11px] font-medium text-[var(--text-strong)]/40"
              >
                {new Date(item.createdAt).toLocaleDateString()}
              </time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
