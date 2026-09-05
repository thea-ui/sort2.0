import React from 'react';
import { Camera, MapPin, Truck, Award } from 'lucide-react';

const STEPS = [
  { icon: Camera, color: 'bg-rose-500', title: 'Report', desc: 'Snap a photo and tap the bin location' },
  { icon: MapPin, color: 'bg-sky-500', title: 'Pin It', desc: 'Drop a pin on the campus bin map' },
  { icon: Truck, color: 'bg-violet-500', title: 'MRF Responds', desc: 'Staff dispatches and collects waste' },
  { icon: Award, color: 'bg-amber-500', title: 'Earn Points', desc: 'Get eco-points for every verified report' },
];

export const HowItWorksCard: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-4">How SORT Works</h3>
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl ${step.color} text-white flex items-center justify-center shrink-0`}>
                <Icon size={14} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{step.title}</p>
                <p className="text-[11px] text-gray-500">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
