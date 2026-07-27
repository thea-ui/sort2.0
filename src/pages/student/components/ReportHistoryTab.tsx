import React from 'react';
import {
  AlertTriangle,
  Scale
} from 'lucide-react';
import { Report, SystemSettings } from '../../../types';

interface ReportHistoryTabProps {
  personalReports: Report[];
  settings: SystemSettings;
  CATEGORY_META: any;
  URGENCY_META: any;
}

export const ReportHistoryTab: React.FC<ReportHistoryTabProps> = ({
  personalReports,
  settings,
  CATEGORY_META,
  URGENCY_META
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Logs Feed</span>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 mt-1">Incident History</h2>
        </div>
        <span className="text-[9px] bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-500 font-bold uppercase tracking-wider">
          {personalReports.length} reports logged
        </span>
      </div>

      {personalReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-sm">
          <AlertTriangle className="mx-auto text-gray-300 mb-2" size={24} />
          <p className="text-xs font-bold text-gray-700">No logs found</p>
        </div>
      ) : (
        <div className="relative border-l border-gray-200 pl-5 ml-3 space-y-4">
          {personalReports.map(rep => {
            const sc = CATEGORY_META[rep.category] || CATEGORY_META.GENERAL;
            return (
              <div key={rep.id} className="relative group">
                <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{rep.title}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                        {rep.locationName} · {rep.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${sc.bg} ${sc.color} border ${sc.border}`}>
                        {rep.status}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${URGENCY_META[rep.urgency].badge}`}>
                        {rep.urgency}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed">{rep.description}</p>
                  
                  {rep.imageUrl && (
                    <div className="mt-3.5 h-20 w-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img src={rep.imageUrl} alt="Verification preview" className="h-full w-full object-cover" />
                    </div>
                  )}

                  {(rep.status === 'COLLECTED' || rep.status === 'RESOLVED') && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      <div className="flex items-center gap-1">
                        <Scale size={11} className="text-emerald-500" />
                        <span>Payload: {rep.weightCollected || '0'} kg</span>
                      </div>
                      {rep.weightCollected && (
                        <span className="text-emerald-600 font-bold">
                          +{rep.weightCollected * settings.pointsPerKgRecyclable} PTS
                        </span>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
