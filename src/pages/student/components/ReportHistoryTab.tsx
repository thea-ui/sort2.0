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
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-heading font-extrabold tracking-tight text-[#00271D]">Activity Log</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your submitted incident reports</p>
        </div>
        <span className="text-[10px] bg-white border border-gray-200 px-4 py-1.5 rounded-full text-gray-500 font-bold uppercase tracking-wider shadow-sm">
          {personalReports.length} reports logged
        </span>
      </div>

      {personalReports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto text-gray-300 mb-2" size={22} />
          <p className="text-xs font-medium text-gray-400">No reports yet. Submit your first report!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personalReports.map(rep => {
            const sc = CATEGORY_META[rep.category] || CATEGORY_META.GENERAL;
            return (
              <div key={rep.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#00271D]">{rep.title}</h4>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {rep.locationName} · {rep.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20">
                        {rep.status}
                      </span>
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${URGENCY_META[rep.urgency].badge}`}>
                        {rep.urgency}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#00271D]/70 leading-relaxed">{rep.description}</p>
                  
                  {rep.imageUrl && (
                    <div className="mt-3 h-20 w-32 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                      <img src={rep.imageUrl} alt="Verification preview" className="h-full w-full object-cover" />
                    </div>
                  )}

                  {(rep.status === 'COLLECTED' || rep.status === 'RESOLVED') && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 bg-gray-50 px-3.5 py-1.5 rounded-xl">
                      <div className="flex items-center gap-1">
                        <Scale size={13} className="text-[#00A77C]" />
                        <span>Payload: {rep.weightCollected || '0'} kg</span>
                      </div>
                      {rep.weightCollected && (
                        <span className="text-[#00A77C] font-bold">
                          +{rep.weightCollected * settings.pointsPerKgRecyclable} PTS
                        </span>
                      )}
                    </div>
                  )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
