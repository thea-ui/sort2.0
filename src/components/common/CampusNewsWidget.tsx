import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { apiService } from '../../services/api';

export const CampusNewsWidget: React.FC = () => {
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    apiService.getCampusNews().then(data => {
      if (Array.isArray(data)) setNews(data.filter((n: any) => n.isPublished).slice(0, 3));
    }).catch(() => {});
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper size={16} className="text-[#00A77C]" />
        <h3 className="text-sm font-bold text-gray-800">Campus News</h3>
      </div>
      <div className="space-y-3">
        {news.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <div className={`h-8 w-8 rounded-lg ${item.iconColor} text-white flex items-center justify-center shrink-0`}>
              <Newspaper size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 leading-snug">{item.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
