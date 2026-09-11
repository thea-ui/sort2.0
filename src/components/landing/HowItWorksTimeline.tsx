import React from 'react';
import { Camera, MapPin, Truck, Award, ArrowRight } from 'lucide-react';

const STEPS = [
  { icon: Camera, color: 'bg-rose-500', title: 'Capture & Report', desc: 'Snap a photo of overflowing waste and submit a quick mobile report.' },
  { icon: MapPin, color: 'bg-sky-500', title: 'Pin on Campus Map', desc: 'Tag your exact campus bin location so MRF teams know where to go.' },
  { icon: Truck, color: 'bg-violet-500', title: 'MRF Dispatch Action', desc: 'Staff receive real-time alerts and dispatch collectors for clearance.' },
  { icon: Award, color: 'bg-amber-500', title: 'Claim Eco-Points', desc: 'Earn non-redeemable participation points and unlock certificates.' },
];

export const HowItWorksTimeline: React.FC = () => {
  return (
    <section id="how-it-works" className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Simple4-Step Process
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            How SORT Works
          </h2>
        </div>

        {/* Horizontal Timeline */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={i} className="relative flex flex-col items-center text-center">
                {/* Step Number */}
                <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-400">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color} text-white shadow-lg`}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>

                {/* Content */}
                <h3 className="mb-2 text-sm font-bold text-gray-900">{step.title}</h3>
                <p className="max-w-[200px] text-[12px] leading-relaxed text-gray-500">{step.desc}</p>

                {/* Arrow connector (hidden on mobile) */}
                {!isLast && (
                  <div className="absolute -right-4 top-8 hidden lg:block">
                    <ArrowRight size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
