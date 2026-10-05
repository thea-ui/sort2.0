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

const FALLBACK_TAG_COLOR = 'bg-gray-100 text-gray-700 border-gray-200';
const FALLBACK_ICON_COLOR = 'bg-[var(--accent)]';

export const CampusNewsSection: React.FC = () => {
  const [news, setNews] = useState<CampusNewsItem[]>([]);

  useEffect(() => {
    apiService.getCampusNews()
      .then(data => {
        if (Array.isArray(data)) {
          setNews(data.filter((n: CampusNewsItem) => n.isPublished));
        }
      })
      .catch(() => {});
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <Newspaper size={14} className="text-[var(--accent)]" strokeWidth={2} />
        <h3 className="text-xs font-bold text-gray-800">Campus News & Updates</h3>
      </div>

      {/* Articles */}
      <div className="flex-1 divide-y divide-gray-50">
        {news.map(item => (
          <div key={item.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-gray-50">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${item.iconColor || FALLBACK_ICON_COLOR}`}>
              <Newspaper size={15} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.tagColor || FALLBACK_TAG_COLOR}`}>
                  {item.tag}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-gray-800">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
