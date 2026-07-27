const fs = require('fs');
const path = require('path');

const code = `import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Report } from '../../types';
import {
  MapPin, AlertOctagon, CheckCircle, Truck, Scale,
  AlertTriangle, Camera, Compass, Send, Clock, Trash2, FileText,
  ChevronRight, Activity, Building2, Layers,
} from 'lucide-react';

type InfrastructurePillar = 'waste' | 'furniture' | 'electronics' | 'fixtures' | 'equipment' | 'other';

interface TeacherDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const PILLAR_META: Record<InfrastructurePillar, { emoji: string; label: string; desc: string }> = {
  waste:       { emoji: '♻️', label: 'Waste / Bin',  desc: 'Litter issues, overflows' },
  furniture:   { emoji: '🪑', label: 'Furniture',    desc: 'Desks, classroom chairs' },
  electronics: { emoji: '💻', label: 'Electronics',  desc: 'Projectors, display screens' },
  fixtures:    { emoji: '💡', label: 'Fixtures',     desc: 'AC fans, lights, switches' },
  equipment:   { emoji: '🛠️', label: 'Equipment',    desc: 'Lab tool, janitorial asset' },
  other:       { emoji: '⚙️', label: 'Other',        desc: 'General structural repair' },
};

const OBSERVATION_OPTIONS = [
  'Damaged', 'Overflowing', 'Abandoned', 'Broken',
  'Needs Maintenance', 'Structural Hazard', 'Worn / Deteriorated', 'Other',
];

const MOCK_IMAGES: Record<InfrastructurePillar, string> = {
  waste:       'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80',
  furniture:   'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&w=400&q=80',
  electronics: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  fixtures:    'https://images.unsplash.com/photo-1565538810844-1e119ba1888a?auto=format&fit=crop&w=400&q=80',
  equipment:   'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  other:       'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
};

const STATUS_BADGE: Record<string, string> = {
  Pending:   'bg-amber-50 text-amber-700 border-amber-200',
  Verified:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  Resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dismissed: 'bg-rose-50 text-rose-700 border-rose-200',
};
const STATUS_LEFT: Record<string, string> = {
  Pending:   'border-l-amber-400',
  Verified:  'border-l-indigo-400',
  Resolved:  'border-l-emerald-400',
  Dismissed: 'border-l-rose-400',
};
const CAT_EMOJI: Record<string, string> = {
  'Waste/Bin': '♻️', Furniture: '🪑', Electronics: '💻',
  Fixtures: '💡', Equipment: '🛠️', Other: '⚙️',
};

const MAP_BOUNDS = { minLat: 14.5980, maxLat: 14.6030, minLng: 120.9820, maxLng: 120.9880 };
const coordToPct = (lat: number, lng: number) => ({
  pctX: ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100,
  pctY: ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100,
});

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, reports, bins, updateBinLevel, toggleBinDispatch, createReport } = useMockData();

  // Map state
  const [selectedBinId, setSelectedBinId] = useState<string | null>('bin-1');
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isCustomDebrisPin, setIsCustomDebrisPin] = useState(false);
  const [assignedLocationText, setAssignedLocationText] = useState('');
  const activeBinDetail = bins.find(b => b.id === selectedBinId);

  // Form state
  const [pillarCategory, setPillarCategory] = useState<InfrastructurePillar>('waste');
  const [reportTitle, setReportTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [observation, setObservation] = useState('Damaged');
  const [selectedBuilding, setSelectedBuilding] = useState('Main Courtyard (Quad)');
  const [roomNumber, setRoomNumber] = useState('');
  const [wizardStep, setWizardStep] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Ledger filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // ── Derived counts ─────────────────────────────────────────────────────────
  const personalReports = reports.filter(r => r.reporterId === 'current');

  const myWasteTotal    = personalReports.filter(r => { const d = r.description.toUpperCase(); return d.includes('[PILLAR: WASTE]') || !d.includes('[PILLAR:'); }).length;
  const myWasteResolved = personalReports.filter(r => { const d = r.description.toUpperCase(); return (d.includes('[PILLAR: WASTE]') || !d.includes('[PILLAR:')) && r.status === 'RESOLVED'; }).length;
  const myAssetTotal    = personalReports.filter(r => { const d = r.description.toUpperCase(); return ['FURNITURE','ELECTRONICS','FIXTURES','EQUIPMENT','OTHER'].some(p => d.includes('[PILLAR: ' + p + ']')); }).length;
  const myAssetResolved = personalReports.filter(r => { const d = r.description.toUpperCase(); return ['FURNITURE','ELECTRONICS','FIXTURES','EQUIPMENT','OTHER'].some(p => d.includes('[PILLAR: ' + p + ']')) && r.status === 'RESOLVED'; }).length;

  const totalKgDiverted = personalReports.reduce((s, r) => s + (r.weightCollected || 0), 0);
  const treesSaved      = (currentUser.points / 120).toFixed(1);
  const ecoRingPct      = Math.min(Math.round((totalKgDiverted / 50) * 100), 100);
  const ecoCirc         = 2 * Math.PI * 14;
  const ecoOffset       = ecoCirc * (1 - ecoRingPct / 100);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => { setCapturedImage(MOCK_IMAGES[pillarCategory]); setIsCapturing(false); }, 900);
  };

  const handleGPSDetect = () => {
    setGpsLoading(true);
    setTimeout(() => {
      const offsets: Record<string, { lat: number; lng: number }> = {
        'Main Courtyard (Quad)': { lat: 14.5995, lng: 120.9842 },
        'Science Hall Cafeteria Side': { lat: 14.6012, lng: 120.9856 },
        'Chemistry Building Room 302 Entrance': { lat: 14.5982, lng: 120.9830 },
        'Main Library Lobby Entrance': { lat: 14.6001, lng: 120.9870 },
        'Sports Complex Entrance B': { lat: 14.6025, lng: 120.9821 },
      };
      setGpsCoords(offsets[selectedBuilding] || { lat: 14.6000, lng: 120.9850 });
      setGpsLoading(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !notes.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const loc = isWaste
        ? (assignedLocationText || 'Campus Map Pin')
        : (roomNumber ? selectedBuilding + ' - ' + roomNumber : selectedBuilding);
      createReport({
        title: reportTitle,
        description: '[Pillar: ' + pillarCategory.toUpperCase() + '] [Obs: ' + observation + '] ' + notes,
        category: 'GENERAL',
        urgency,
        locationName: loc,
        coordinates: gpsCoords || { lat: 14.6000, lng: 120.9850 },
        imageUrl: capturedImage || undefined,
      });
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setReportTitle(''); setNotes(''); setObservation('Damaged');
      setCapturedImage(null); setGpsCoords(null); setIsCustomDebrisPin(false);
      setPillarCategory('waste'); setSelectedBuilding('Main Courtyard (Quad)');
      setRoomNumber(''); setWizardStep(1);
      setTimeout(() => setSubmitSuccess(false), 4000);
    }, 1200);
  };

  // ── Ledger helpers ──────────────────────────────────────────────────────────
  const getDisplayStatus = (status: string, title: string) => {
    if (title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) return 'Dismissed';
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'DISPATCHED': return 'Verified';
      case 'COLLECTED': case 'RESOLVED': return 'Resolved';
      default: return 'Pending';
    }
  };

  const getDisplayCategory = (desc: string) => {
    const u = desc.toUpperCase();
    if (u.includes('[PILLAR: WASTE]')) return 'Waste/Bin';
    if (u.includes('[PILLAR: FURNITURE]')) return 'Furniture';
    if (u.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
    if (u.includes('[PILLAR: FIXTURES]')) return 'Fixtures';
    if (u.includes('[PILLAR: EQUIPMENT]')) return 'Equipment';
    if (u.includes('[PILLAR: OTHER]')) return 'Other';
    return 'Waste/Bin';
  };

  const STEPS = ['Category & Subject', 'Evidence & Location', 'Review & Submit'];
  const isWaste = pillarCategory === 'waste';

  const timelineReports: Report[] = [
    ...personalReports,
    {
      id: 'mock-d-1',
      title: 'Duplicate Bin Placement Alert [Dismissed]',
      description: '[PILLAR: WASTE] Secondary bin dismissed.',
      status: 'PENDING' as any,
      urgency: 'LOW' as const,
      category: 'GENERAL' as const,
      coordinates: { lat: 14.6000, lng: 120.9850 },
      locationName: 'Sports Complex - Floor 1',
      reporterId: 'current',
      reporterName: currentUser.name,
      pointsAwarded: 0,
      timestamp: '2026-07-15 14:20',
      imageUrl: undefined,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ══════ 1. OVERVIEW ══════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">

          {/* Profile Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 80% 60% at 0% 50%, rgba(99,102,241,0.06), transparent)' }}
            />
            <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={\`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md \${getAvatarColor(currentUser.name)}\`}>
                  {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight text-gray-900">{currentUser.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Faculty Reporter
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400">{currentUser.email} • Employee ID: {currentUser.employeeId}</p>
                  <p className="mt-1 text-[11px] font-semibold text-gray-600">Science Department — Infrastructure Lead</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <Building2 size={16} className="text-indigo-600" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Department</p>
                  <p className="text-xs font-black text-gray-800">Science Hall</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Waste card */}
            <div className="group relative overflow-hidden rounded-xl border border-l-4 border-gray-200 border-l-emerald-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <Trash2 size={16} className="text-emerald-600" strokeWidth={2} />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">Operations</span>
              </div>
              <p className="mt-4 text-3xl font-black tabular-nums text-gray-900">{myWasteTotal}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-gray-700">Waste & Litter Reports</p>
              <p className="mt-0.5 text-[10px] text-gray-400">{myWasteResolved} resolved of {myWasteTotal}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: myWasteTotal > 0 ? \`\${(myWasteResolved / myWasteTotal) * 100}%\` : '0%' }} />
              </div>
            </div>

            {/* Asset card */}
            <div className="group relative overflow-hidden rounded-xl border border-l-4 border-gray-200 border-l-amber-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <Layers size={16} className="text-amber-600" strokeWidth={2} />
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">Infrastructure</span>
              </div>
              <p className="mt-4 text-3xl font-black tabular-nums text-gray-900">{myAssetTotal}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-gray-700">Asset Recovery Reports</p>
              <p className="mt-0.5 text-[10px] text-gray-400">{myAssetResolved} resolved of {myAssetTotal}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: myAssetTotal > 0 ? \`\${(myAssetResolved / myAssetTotal) * 100}%\` : '0%' }} />
              </div>
            </div>

            {/* Eco Impact card */}
            <div className="group relative overflow-hidden rounded-xl border border-l-4 border-gray-200 border-l-indigo-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <Activity size={16} className="text-indigo-600" strokeWidth={2} />
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600">Eco Impact</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="url(#eco-g)" strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={\`\${ecoCirc}\`}
                      strokeDashoffset={\`\${ecoOffset}\`}
                      style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    <defs>
                      <linearGradient id="eco-g" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-gray-700">{ecoRingPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black tabular-nums text-gray-900">
                    {totalKgDiverted} <span className="text-xs font-bold text-gray-400">kg</span>
                  </p>
                  <p className="text-[11px] font-semibold text-gray-600">Waste Diverted</p>
                  <p className="mt-1 text-[10px] text-gray-400">🌳 {treesSaved} trees equivalent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick Actions</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setActiveTab('submit-report')}
                className="group relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm transition-transform group-hover:scale-105">
                  <Send size={16} className="text-white" strokeWidth={2} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">File a Report</p>
                <p className="mt-0.5 text-[10px] text-gray-500">Submit structural or waste logs</p>
                <ChevronRight size={14} className="absolute bottom-4 right-4 text-indigo-300" />
              </button>
              <button type="button" onClick={() => setActiveTab('bin-map')}
                className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                  <MapPin size={16} className="text-white" strokeWidth={2} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">View Live Map</p>
                <p className="mt-0.5 text-[10px] text-gray-500">Monitor node status & capacity</p>
                <ChevronRight size={14} className="absolute bottom-4 right-4 text-emerald-300" />
              </button>
              <button type="button" onClick={() => setActiveTab('report-history')}
                className="group relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 shadow-sm transition-transform group-hover:scale-105">
                  <Clock size={16} className="text-white" strokeWidth={2} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">Track My Activity</p>
                <p className="mt-0.5 text-[10px] text-gray-500">Inspect personal reporting ledger</p>
                <ChevronRight size={14} className="absolute bottom-4 right-4 text-amber-300" />
              </button>
            </div>
          </div>

          {/* Recent Submissions Feed */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <FileText size={13} className="text-gray-500" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recent Submissions</p>
              </div>
              <button type="button" onClick={() => setActiveTab('report-history')}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">View All →</button>
            </div>
            <div className="divide-y divide-gray-50">
              {personalReports.slice(0, 3).map(rep => {
                const ds = getDisplayStatus(rep.status, rep.title);
                const dc = getDisplayCategory(rep.description);
                return (
                  <div key={rep.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-sm">
                      {CAT_EMOJI[dc] || '📁'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-800">{rep.title}</p>
                      <p className="text-[10px] text-gray-400">{rep.locationName} · {rep.timestamp}</p>
                    </div>
                    <span className={\`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider \${STATUS_BADGE[ds]}\`}>{ds}</span>
                  </div>
                );
              })}
              {personalReports.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-xs text-gray-400">No submissions yet. File your first report!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ 2. FILE A REPORT ══════ */}
      {activeTab === 'submit-report' && (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Header */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Faculty Service Portal
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">Multi-Category Asset Report</h2>
            <p className="mt-1 text-xs text-gray-500">File structural maintenance tickets, broken assets, or environmental anomalies directly to MRF administrators.</p>
          </div>

          {/* Step tracker */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const n = idx + 1;
                const done = wizardStep > n;
                const active = wizardStep === n;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={\`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black transition-all \${
                        done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-100 text-gray-400'
                      }\`}>
                        {done ? <CheckCircle size={13} /> : n}
                      </div>
                      <p className={\`mt-1 whitespace-nowrap text-[9px] font-bold \${active ? 'text-indigo-600' : 'text-gray-400'}\`}>{step}</p>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={\`mx-1 mb-4 h-px flex-1 transition-all \${wizardStep > n ? 'bg-indigo-600' : 'bg-gray-200'}\`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {submitSuccess && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Maintenance Ticket Logged Successfully!</p>
                <p className="mt-0.5 text-[10px] text-emerald-600/90">The MRF operations center has been notified.</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">

              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Select Recovery Category</label>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {(Object.entries(PILLAR_META) as [InfrastructurePillar, typeof PILLAR_META.waste][]).map(([id, meta]) => {
                        const sel = pillarCategory === id;
                        return (
                          <button key={id} type="button" onClick={() => setPillarCategory(id)}
                            className={\`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer select-none \${
                              sel ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                            }\`}>
                            <span className="text-base">{meta.emoji}</span>
                            <span className="text-[10px] font-bold">{meta.label}</span>
                            <span className={\`text-[8px] leading-tight \${sel ? 'text-indigo-200' : 'text-gray-400'}\`}>{meta.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Maintenance Subject / Title</label>
                    <input type="text" required placeholder="e.g. Broken Desk in Room 204"
                      value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:bg-white placeholder:font-normal" />
                  </div>
                  <div className="flex justify-end">
                    <button type="button" disabled={!reportTitle.trim()} onClick={() => setWizardStep(2)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                      Continue <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  {/* Photo */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Verification Photo</label>
                    <div className="relative h-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {isCapturing ? (
                        <div className="animate-pulse text-center">
                          <Camera className="mx-auto text-indigo-500" size={22} />
                          <p className="mt-1 text-[9px] font-bold text-indigo-600 uppercase">Accessing Camera...</p>
                        </div>
                      ) : capturedImage ? (
                        <div className="group relative h-full w-full">
                          <img src={capturedImage} alt="Evidence" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" onClick={handleCapture}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[9px] font-bold text-white cursor-pointer">Retake</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 px-4 text-center">
                          <Camera className="mx-auto text-gray-300" size={22} />
                          <p className="text-[9px] text-gray-400">Capture or upload evidence photo</p>
                          <div className="flex justify-center gap-2">
                            <button type="button" onClick={handleCapture}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[9px] font-bold text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer">Mock Camera</button>
                            <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[9px] font-bold text-gray-600 shadow-sm hover:bg-gray-50">
                              Upload File
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) { const r = new FileReader(); r.onload = ev => setCapturedImage(ev.target?.result as string); r.readAsDataURL(f); }
                              }} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conditional location logic */}
                  {isWaste ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Pin Location on Campus Map</label>
                      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                        <div>
                          <p className="text-[10px] font-bold text-amber-800">Waste/Bin — Map Pinning Required</p>
                          <p className="text-[9px] text-amber-700">Enable pinning mode, then click the exact location on the campus grid.</p>
                        </div>
                        <button type="button" onClick={() => setIsPinningMode(!isPinningMode)}
                          className={\`ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer \${
                            isPinningMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }\`}>
                          <Compass size={11} className={isPinningMode ? 'animate-spin' : ''} />
                          {isPinningMode ? 'Pinning Active' : 'Enable Pinning'}
                        </button>
                      </div>
                      <div onClick={e => {
                        if (!isPinningMode) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pctX = (e.clientX - rect.left) / rect.width;
                        const pctY = (e.clientY - rect.top) / rect.height;
                        const lat = MAP_BOUNDS.maxLat - pctY * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                        const lng = MAP_BOUNDS.minLng + pctX * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                        setGpsCoords({ lat, lng }); setIsCustomDebrisPin(true);
                        setAssignedLocationText(\`Pinned at [\${lat.toFixed(4)}, \${lng.toFixed(4)}]\`);
                      }}
                        className={\`relative h-52 w-full overflow-hidden rounded-xl border bg-slate-900 border-slate-700 shadow-inner \${isPinningMode ? 'cursor-crosshair ring-2 ring-indigo-500/50' : 'cursor-default'}\`}>
                        <svg className="absolute inset-0 h-full w-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                          <defs><pattern id="wiz-g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" /></pattern></defs>
                          <rect width="100%" height="100%" fill="url(#wiz-g)" />
                          <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#475569" /><text x="25%" y="19%" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">Sports Gym</text>
                          <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#475569" /><text x="76%" y="22%" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">Science Hall</text>
                          <circle cx="50%" cy="50%" r="36" fill="#334155" /><text x="50%" y="51%" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">Quad</text>
                          <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#475569" /><text x="22%" y="81%" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>
                          <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#475569" /><text x="74%" y="83%" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">Main Library</text>
                        </svg>
                        <div className="pointer-events-none absolute left-2 top-2 rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[7px] font-bold uppercase text-slate-400">Campus Grid</div>
                        {isCustomDebrisPin && gpsCoords && (() => {
                          const { pctX, pctY } = coordToPct(gpsCoords.lat, gpsCoords.lng);
                          return (
                            <div style={{ left: \`\${pctX}%\`, top: \`\${pctY}%\` }}
                              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 animate-bounce items-center justify-center rounded-full border border-rose-400 bg-rose-500 text-white shadow-xl">
                              <MapPin size={14} strokeWidth={2.5} />
                            </div>
                          );
                        })()}
                      </div>
                      {gpsCoords ? (
                        <p className="text-center text-[9px] font-bold text-indigo-600">📍 Pinned: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</p>
                      ) : (
                        <p className="animate-pulse text-center text-[9px] text-gray-400">Enable pinning and click a location above</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Campus Building</label>
                          <select value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer">
                            <option>Main Courtyard (Quad)</option>
                            <option value="Science Hall Cafeteria Side">Science Hall</option>
                            <option value="Chemistry Building Room 302 Entrance">Chemistry Building</option>
                            <option value="Main Library Lobby Entrance">Main Library</option>
                            <option value="Sports Complex Entrance B">Sports Complex</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">3. Floor / Room Number</label>
                          <input type="text" required placeholder="e.g. Room 302 or 2nd Floor"
                            value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Telemetry Coordinates</p>
                          <p className="font-mono text-[10px] text-gray-600">
                            {gpsCoords ? \`\${gpsCoords.lat.toFixed(4)}, \${gpsCoords.lng.toFixed(4)}\` : 'Not detected'}
                          </p>
                        </div>
                        <button type="button" onClick={handleGPSDetect} disabled={gpsLoading}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-600 shadow-sm hover:border-indigo-400 cursor-pointer">
                          <MapPin size={10} className={gpsLoading ? 'animate-spin' : ''} />
                          {gpsLoading ? 'Detecting...' : 'Detect GPS'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <button type="button" onClick={() => setWizardStep(1)}
                      className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer">← Back</button>
                    <button type="button" disabled={isWaste ? !gpsCoords : !roomNumber.trim()} onClick={() => setWizardStep(3)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                      Continue <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Priority Severity</label>
                      <select value={urgency} onChange={e => setUrgency(e.target.value as any)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer">
                        <option value="LOW">🟢 Low Severity</option>
                        <option value="MEDIUM">🟡 Medium Priority</option>
                        <option value="HIGH">🔴 Critical (Immediate)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Condition / Observation</label>
                      <select value={observation} onChange={e => setObservation(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer">
                        {OBSERVATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">3. Detailed Observations</label>
                    <textarea required rows={3} placeholder="Describe specific damage, affected area, or operational notes..."
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white placeholder:font-normal" />
                  </div>
                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="inline-block rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">Ticket Preview</span>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="text-gray-500">Category: <span className="font-bold capitalize text-gray-800">{PILLAR_META[pillarCategory].label}</span></div>
                      <div className="text-gray-500">Severity: <span className="font-bold uppercase text-gray-800">{urgency}</span></div>
                      <div className="text-gray-500">Condition: <span className="font-bold text-gray-800">{observation}</span></div>
                      <div className="text-gray-500">Location: <span className="font-bold text-gray-800">{isWaste ? 'Map pin' : \`\${selectedBuilding}\${roomNumber ? \` · \${roomNumber}\` : ''}\`}</span></div>
                      <div className="col-span-2 text-gray-500">Subject: <span className="font-bold text-gray-800">{reportTitle}</span></div>
                    </div>
                  </div>
                  <div className="flex justify-between pt-1">
                    <button type="button" onClick={() => setWizardStep(2)}
                      className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer">← Back</button>
                    <button type="submit" disabled={isSubmitting || !notes.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                      {isSubmitting ? (
                        <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Logging...</span></>
                      ) : (
                        <><Send size={12} /><span>Log Maintenance Ticket</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ══════ 3. ACTIVITY LEDGER ══════ */}
      {activeTab === 'report-history' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Ledger Log
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-gray-900">My Activity</h2>
            <p className="mt-0.5 text-[11px] text-gray-400">All submitted maintenance and waste recovery tickets.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All','Pending','Verified','Resolved','Dismissed'] as const).map(s => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={\`rounded-full border px-3 py-1 text-[10px] font-bold transition-all cursor-pointer \${
                  statusFilter === s ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }\`}>{s}</button>
            ))}
            <div className="mx-1 h-6 w-px self-center bg-gray-200" />
            {(['All','Waste/Bin','Furniture','Electronics','Fixtures','Equipment','Other'] as const).map(c => (
              <button key={c} type="button" onClick={() => setCategoryFilter(c)}
                className={\`rounded-full border px-3 py-1 text-[10px] font-bold transition-all cursor-pointer \${
                  categoryFilter === c ? 'border-gray-800 bg-gray-800 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }\`}>{CAT_EMOJI[c] || ''} {c}</button>
            ))}
          </div>

          {(() => {
            const filtered = timelineReports.filter(rep => {
              const ds = getDisplayStatus(rep.status, rep.title);
              const dc = getDisplayCategory(rep.description);
              return (statusFilter === 'All' || ds === statusFilter) && (categoryFilter === 'All' || dc === categoryFilter);
            });
            if (filtered.length === 0) return (
              <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <AlertTriangle className="mx-auto mb-2 text-gray-200" size={28} />
                <p className="text-xs font-bold text-gray-400">No reports match your filters.</p>
              </div>
            );
            return (
              <div className="space-y-2.5">
                {filtered.map(rep => {
                  const ds = getDisplayStatus(rep.status, rep.title);
                  const dc = getDisplayCategory(rep.description);
                  return (
                    <div key={rep.id} className={\`flex items-start gap-3 rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md \${STATUS_LEFT[ds] || 'border-l-gray-300'} border-gray-200\`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-base">{CAT_EMOJI[dc] || '📁'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900">{rep.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-gray-500">{rep.description.replace(/\\[.*?\\]/g, '').trim()}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold text-gray-400">
                          <Clock size={9} /><span>{rep.timestamp}</span><span>•</span><MapPin size={9} /><span>{rep.locationName}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={\`rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider \${STATUS_BADGE[ds]}\`}>{ds}</span>
                        {rep.imageUrl && (
                          <div className="h-9 w-14 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                            <img src={rep.imageUrl} alt="Evidence" className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════ 4. LIVE BIN MAP ══════ */}
      {activeTab === 'bin-map' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" /> Live Telemetry
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-gray-900">Campus Bin Map</h2>
            <p className="mt-0.5 text-[11px] text-gray-400">Real-time disposal node status and capacity monitoring across campus zones.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                {dot:'bg-red-500 animate-pulse', label:'Full (≥85%)', pill:'bg-red-50 border-red-100 text-red-700'},
                {dot:'bg-amber-400', label:'Almost Full (60–84%)', pill:'bg-amber-50 border-amber-100 text-amber-700'},
                {dot:'bg-emerald-500', label:'Available (<60%)', pill:'bg-emerald-50 border-emerald-100 text-emerald-700'},
              ].map(item => (
                <span key={item.label} className={\`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold \${item.pill}\`}>
                  <span className={\`h-2 w-2 rounded-full \${item.dot}\`} />{item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Interactive Campus Grid</p>
                  <button type="button" onClick={() => { setIsPinningMode(!isPinningMode); if (!isPinningMode) setSelectedBinId(null); }}
                    className={\`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer \${
                      isPinningMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }\`}>
                    <Compass size={11} className={isPinningMode ? 'animate-spin' : ''} />
                    {isPinningMode ? 'Pinning Active' : 'Drop Debris Pin'}
                  </button>
                </div>
                <div onClick={e => {
                  if (!isPinningMode) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pctX = (e.clientX - rect.left) / rect.width;
                  const pctY = (e.clientY - rect.top) / rect.height;
                  const lat = MAP_BOUNDS.maxLat - pctY * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                  const lng = MAP_BOUNDS.minLng + pctX * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                  setGpsCoords({ lat, lng }); setSelectedBinId(null); setIsCustomDebrisPin(true);
                  setAssignedLocationText(\`Custom Debris at [\${lat.toFixed(4)}, \${lng.toFixed(4)}]\`);
                }}
                  className={\`relative h-72 w-full overflow-hidden rounded-xl border bg-slate-900 border-slate-700 shadow-inner sm:h-80 \${isPinningMode ? 'cursor-crosshair ring-2 ring-indigo-500/40' : 'cursor-default'}\`}>
                  <svg className="absolute inset-0 h-full w-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs><pattern id="t-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" /></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#t-grid)" />
                    <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#475569" /><text x="25%" y="19%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Sports Gym</text>
                    <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#475569" /><text x="76%" y="22%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Science Hall</text>
                    <circle cx="50%" cy="50%" r="40" fill="#334155" /><text x="50%" y="51%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Quad</text>
                    <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#475569" /><text x="22%" y="81%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>
                    <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#475569" /><text x="74%" y="83%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Main Library</text>
                  </svg>
                  <div className="pointer-events-none absolute left-2 top-2 rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[7px] font-bold uppercase text-slate-400">Faculty Grid Tracking</div>
                  {bins.map(bin => {
                    const { pctX, pctY } = coordToPct(bin.coordinates.lat, bin.coordinates.lng);
                    const isSel = selectedBinId === bin.id;
                    const isCrit = bin.fillLevel >= 85;
                    const isMed = bin.fillLevel >= 60 && bin.fillLevel < 85;
                    const tc = isCrit ? 'text-red-400 bg-red-950/80 border-red-800' : isMed ? 'text-amber-400 bg-amber-950/80 border-amber-800' : 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
                    const isDual = bin.locationName === 'Main Courtyard (Quad)' || bin.locationName === 'Science Hall Cafeteria Side';
                    if (isDual) return (
                      <div key={bin.id} style={{ left: \`\${pctX}%\`, top: \`\${pctY}%\` }}
                        onClick={e => { e.stopPropagation(); setSelectedBinId(bin.id); setIsCustomDebrisPin(false); setGpsCoords(bin.coordinates); setAssignedLocationText(bin.locationName); }}
                        className={\`absolute -translate-x-1/2 -translate-y-1/2 flex cursor-pointer select-none items-center gap-1 rounded-lg border bg-slate-900 p-1 shadow-lg transition-all hover:scale-105 z-20 \${isSel ? 'border-indigo-400' : 'border-slate-800'}\`}>
                        <div className="rounded bg-emerald-950/90 p-1 text-emerald-400 border border-emerald-800"><Trash2 size={11} strokeWidth={2.5} /><span className="block text-center text-[5px] font-black uppercase mt-0.5">BIO</span></div>
                        <div className={\`rounded p-1 \${tc}\`}><Scale size={11} strokeWidth={2.5} /><span className="block text-center text-[5px] font-black uppercase mt-0.5">NON</span></div>
                        {isSel && <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" /></div>}
                      </div>
                    );
                    return (
                      <div key={bin.id} style={{ left: \`\${pctX}%\`, top: \`\${pctY}%\` }}
                        onClick={e => { e.stopPropagation(); setSelectedBinId(bin.id); setIsCustomDebrisPin(false); setGpsCoords(bin.coordinates); setAssignedLocationText(bin.locationName); }}
                        className={\`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none flex flex-col items-center justify-center rounded-lg border p-2 shadow-lg transition-all hover:scale-105 z-20 \${tc} \${isSel ? 'border-indigo-400' : 'border-transparent'}\`}>
                        <Trash2 size={13} strokeWidth={2.5} />
                        <span className="mt-0.5 text-[5px] font-black uppercase">{bin.type.slice(0,4)}</span>
                        {isSel && <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" /></div>}
                      </div>
                    );
                  })}
                  {isCustomDebrisPin && gpsCoords && (() => {
                    const { pctX, pctY } = coordToPct(gpsCoords.lat, gpsCoords.lng);
                    return (
                      <div style={{ left: \`\${pctX}%\`, top: \`\${pctY}%\` }}
                        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 animate-bounce items-center justify-center rounded-full border border-rose-400 bg-rose-500 text-white shadow-xl">
                        <MapPin size={14} strokeWidth={2.5} />
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Active Bins Status</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {bins.map(bin => {
                    const isSel = selectedBinId === bin.id;
                    const lvl = bin.fillLevel >= 85 ? 'bg-red-500' : bin.fillLevel >= 60 ? 'bg-amber-400' : 'bg-emerald-500';
                    return (
                      <div key={bin.id}
                        onClick={() => { setSelectedBinId(bin.id); setIsCustomDebrisPin(false); setGpsCoords(bin.coordinates); setAssignedLocationText(bin.locationName); }}
                        className={\`cursor-pointer select-none rounded-xl border p-3.5 transition-all \${isSel ? 'border-indigo-400 bg-indigo-50/30 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}\`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="truncate text-xs font-bold text-gray-800">{bin.name}</p><p className="text-[10px] text-gray-400">{bin.locationName}</p></div>
                          <span className="shrink-0 text-xs font-black text-gray-700">{bin.fillLevel}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"><div className={\`h-full rounded-full transition-all \${lvl}\`} style={{ width: \`\${bin.fillLevel}%\` }} /></div>
                        <div className="mt-2 flex justify-between text-[9px] font-bold text-gray-400">
                          <span className="uppercase">{bin.type}</span>
                          {bin.activeDispatch ? <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 border border-violet-100">DISPATCH ACTIVE</span> : <span className="text-gray-300 uppercase">STANDBY</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              {activeBinDetail ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-indigo-700">Node Telemetry</span>
                    <h4 className="mt-2 text-sm font-bold text-gray-900">{activeBinDetail.name}</h4>
                    <p className="text-[10px] text-gray-400">{activeBinDetail.locationName}</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[{label:'Classification',value:activeBinDetail.type},{label:'Last Collection',value:activeBinDetail.lastEmptied||'Unknown'}].map(row => (
                      <div key={row.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="font-bold text-gray-400">{row.label}</span>
                        <span className="font-extrabold uppercase text-gray-800">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <span className="font-bold text-gray-400">Fill Level</span>
                      <span className={\`font-black \${activeBinDetail.fillLevel >= 85 ? 'text-red-500' : activeBinDetail.fillLevel >= 60 ? 'text-amber-500' : 'text-emerald-600'}\`}>{activeBinDetail.fillLevel}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={\`h-full rounded-full transition-all \${activeBinDetail.fillLevel >= 85 ? 'bg-red-500' : activeBinDetail.fillLevel >= 60 ? 'bg-amber-400' : 'bg-emerald-500'}\`}
                        style={{ width: \`\${activeBinDetail.fillLevel}%\` }} />
                    </div>
                    <div className="pt-1">
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">Manual Fill Override</p>
                      <div className="flex gap-1.5">{[30,75,95].map(l => (
                        <button key={l} type="button" onClick={() => updateBinLevel(activeBinDetail.id, l)}
                          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">{l}%</button>
                      ))}</div>
                    </div>
                    <button type="button" onClick={() => toggleBinDispatch(activeBinDetail.id)}
                      className={\`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer \${
                        activeBinDetail.activeDispatch ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                      }\`}>
                      <Truck size={13} />
                      {activeBinDetail.activeDispatch ? 'Cancel MRF Dispatch' : 'Dispatch MRF Recovery'}
                    </button>
                  </div>
                </div>
              ) : isCustomDebrisPin && gpsCoords ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose-700">Unmanaged Debris</span>
                    <h4 className="mt-2 text-sm font-bold text-gray-900">{assignedLocationText}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 font-mono text-[10px] text-gray-600">
                    <div>Lat: {gpsCoords.lat.toFixed(5)}</div><div>Lng: {gpsCoords.lng.toFixed(5)}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[11px] text-indigo-700">
                    💡 <span className="font-bold">Tip:</span> Use the <span className="font-bold">File a Report</span> tab to log this location as a formal ticket.
                  </div>
                  <button type="button" onClick={() => { setIsCustomDebrisPin(false); setGpsCoords(null); setAssignedLocationText(''); }}
                    className="w-full rounded-xl border border-gray-200 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 cursor-pointer">Clear Pin</button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                  <AlertOctagon size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-xs font-bold text-gray-400">Select a bin on the map to view telemetry and dispatch controls.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'pages', 'teacher', 'TeacherDashboard.tsx'), code, 'utf8');
console.log('Written', code.length, 'bytes');
