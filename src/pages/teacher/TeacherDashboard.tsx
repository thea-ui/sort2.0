import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Report } from '../../types';

// Sub-components matching StudentDashboard architecture
import { TeacherOverviewTab } from './components/TeacherOverviewTab';
import { TeacherSubmitReportTab } from './components/TeacherSubmitReportTab';
import { TeacherBinMapTab } from './components/TeacherBinMapTab';
import { TeacherReportHistoryTab } from './components/TeacherReportHistoryTab';

type InfrastructurePillar = 'waste' | 'furniture' | 'electronics' | 'fixtures' | 'equipment' | 'other';

interface TeacherDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const PILLAR_META: Record<InfrastructurePillar, { emoji: string; label: string; desc: string; accent: string; iconBg: string; iconText: string; border: string }> = {
  waste:       { emoji: '♻️', label: 'Waste / Bin',  desc: 'Litter issues, overflows',       accent: 'emerald', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-emerald-200' },
  furniture:   { emoji: '🪑', label: 'Furniture',    desc: 'Desks, classroom chairs',         accent: 'amber',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   border: 'border-amber-200'   },
  electronics: { emoji: '💻', label: 'Electronics',  desc: 'Projectors, display screens',     accent: 'sky',     iconBg: 'bg-sky-50',     iconText: 'text-sky-600',     border: 'border-sky-200'     },
  fixtures:    { emoji: '💡', label: 'Fixtures',     desc: 'AC fans, lights, switches',       accent: 'violet',  iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  border: 'border-violet-200'  },
  equipment:   { emoji: '🛠️', label: 'Equipment',    desc: 'Lab tool, janitorial asset',      accent: 'rose',    iconBg: 'bg-rose-50',    iconText: 'text-rose-600',    border: 'border-rose-200'    },
  other:       { emoji: '⚙️', label: 'Other',        desc: 'General structural repair',       accent: 'zinc',    iconBg: 'bg-zinc-50',    iconText: 'text-zinc-600',    border: 'border-zinc-200'    },
};

const OBSERVATION_OPTIONS = [
  'Damaged',
  'Overflowing',
  'Abandoned',
  'Broken',
  'Needs Maintenance',
  'Structural Hazard',
  'Worn / Deteriorated',
  'Other',
];

const mockImages: Record<InfrastructurePillar, string> = {
  waste:       'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80',
  furniture:   'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&w=400&q=80',
  electronics: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  fixtures:    'https://images.unsplash.com/photo-1565538810844-1e119ba1888a?auto=format&fit=crop&w=400&q=80',
  equipment:   'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  other:       'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
};

const STEPS = ['Category & Subject', 'Evidence & Location', 'Review & Submit'];

const MAP_BOUNDS = { minLat: 14.5980, maxLat: 14.6030, minLng: 120.9820, maxLng: 120.9880 };

const coordToPct = (lat: number, lng: number) => ({
  pctX: ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100,
  pctY: ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100,
});

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    reports,
    bins,
    updateBinLevel,
    toggleBinDispatch,
    createReport,
  } = useMockData();

  // Map state
  const [selectedBinId, setSelectedBinId] = useState<string | null>('bin-1');
  const activeBinDetail = bins.find(b => b.id === selectedBinId);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isCustomDebrisPin, setIsCustomDebrisPin] = useState(false);
  const [assignedLocationText, setAssignedLocationText] = useState('Main Courtyard (Quad)');

  // Report form state
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

  // Activity ledger filter
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // ── Derived counts ────────────────────────────────────────────────────
  const personalReports = reports.filter(r => r.reporterId === 'current');

  const myWasteReportsCount = personalReports.filter(r => {
    const d = r.description.toUpperCase();
    return d.includes('[PILLAR: WASTE]') || !d.includes('[PILLAR:');
  }).length;

  const myWasteResolved = personalReports.filter(r => {
    const d = r.description.toUpperCase();
    return (d.includes('[PILLAR: WASTE]') || !d.includes('[PILLAR:')) && r.status === 'RESOLVED';
  }).length;

  const myAssetReportsCount = personalReports.filter(r => {
    const d = r.description.toUpperCase();
    return d.includes('[PILLAR: FURNITURE]') || d.includes('[PILLAR: ELECTRONICS]') ||
           d.includes('[PILLAR: FIXTURES]')  || d.includes('[PILLAR: EQUIPMENT]')   ||
           d.includes('[PILLAR: OTHER]');
  }).length;

  const myAssetResolved = personalReports.filter(r => {
    const d = r.description.toUpperCase();
    return (d.includes('[PILLAR: FURNITURE]') || d.includes('[PILLAR: ELECTRONICS]') ||
            d.includes('[PILLAR: FIXTURES]')  || d.includes('[PILLAR: EQUIPMENT]')   ||
            d.includes('[PILLAR: OTHER]')) && r.status === 'RESOLVED';
  }).length;

  const totalKgDiverted  = personalReports.reduce((s, r) => s + (r.weightCollected || 0), 0);
  const treesSaved       = (currentUser.points / 120).toFixed(1);
  const ecoRingPct       = Math.min(Math.round((totalKgDiverted / 50) * 100), 100);
  const ecoCircumference = 2 * Math.PI * 14;
  const ecoOffset        = ecoCircumference * (1 - ecoRingPct / 100);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setCapturedImage(mockImages[pillarCategory]);
      setIsCapturing(false);
    }, 900);
  };

  const handleGPSDetect = () => {
    setGpsLoading(true);
    setTimeout(() => {
      const offsets: Record<string, { lat: number; lng: number }> = {
        'Main Courtyard (Quad)':              { lat: 14.5995, lng: 120.9842 },
        'Science Hall Cafeteria Side':        { lat: 14.6012, lng: 120.9856 },
        'Chemistry Building Room 302 Entrance':{ lat: 14.5982, lng: 120.9830 },
        'Main Library Lobby Entrance':        { lat: 14.6001, lng: 120.9870 },
        'Sports Complex Entrance B':          { lat: 14.6025, lng: 120.9821 },
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
      const pillarText   = `[Pillar: ${pillarCategory.toUpperCase()}]`;
      const obsText      = `[Observation: ${observation}]`;
      const pinText      = isCustomDebrisPin ? '[Custom Debris Pin]' : '[Designated Location]';
      const formattedDesc = `${pillarText} ${obsText} ${pinText} ${notes}`;
      const buildingAndRoom = roomNumber.trim() ? `${selectedBuilding} - ${roomNumber}` : selectedBuilding;

      createReport({
        title: reportTitle,
        description: formattedDesc,
        category: 'GENERAL',
        urgency,
        locationName: buildingAndRoom,
        coordinates: gpsCoords || { lat: 14.6000, lng: 120.9850 },
        imageUrl: capturedImage || undefined,
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);
      setReportTitle('');
      setNotes('');
      setObservation('Damaged');
      setCapturedImage(null);
      setGpsCoords(null);
      setIsCustomDebrisPin(false);
      setPillarCategory('waste');
      setSelectedBuilding('Main Courtyard (Quad)');
      setRoomNumber('');
      setWizardStep(1);
      setTimeout(() => setSubmitSuccess(false), 4000);
    }, 1200);
  };

  // ── Ledger helpers ────────────────────────────────────────────────────
  const getDisplayStatus = (status: string, title: string) => {
    if (title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) return 'Dismissed';
    switch (status) {
      case 'PENDING':    return 'Pending';
      case 'DISPATCHED': return 'Verified';
      case 'COLLECTED':
      case 'RESOLVED':   return 'Resolved';
      default:           return 'Pending';
    }
  };

  const getDisplayCategory = (desc: string) => {
    const u = desc.toUpperCase();
    if (u.includes('[PILLAR: WASTE]'))       return 'Waste/Bin';
    if (u.includes('[PILLAR: FURNITURE]'))   return 'Furniture';
    if (u.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
    if (u.includes('[PILLAR: FIXTURES]'))    return 'Fixtures';
    if (u.includes('[PILLAR: EQUIPMENT]'))   return 'Equipment';
    if (u.includes('[PILLAR: OTHER]'))       return 'Other';
    return 'Waste/Bin';
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

  const timelineReports: Report[] = [
    ...personalReports,
    {
      id: 'mock-dismissed-1',
      title: 'Duplicate Bin Placement Alert [Dismissed]',
      description: '[Pillar: WASTE] [Observation: Overflowing] [Custom Debris Pin] Secondary bin placement requested in sports corridor.',
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

  const isWasteCategory = pillarCategory === 'waste';

  return (
    <div className="w-full">
      {activeTab === 'overview' && (
        <TeacherOverviewTab
          currentUser={currentUser}
          personalReports={personalReports}
          myWasteReportsCount={myWasteReportsCount}
          myWasteResolved={myWasteResolved}
          myAssetReportsCount={myAssetReportsCount}
          myAssetResolved={myAssetResolved}
          totalKgDiverted={totalKgDiverted}
          treesSaved={treesSaved}
          ecoRingPct={ecoRingPct}
          ecoCircumference={ecoCircumference}
          ecoOffset={ecoOffset}
          getAvatarColor={getAvatarColor}
          setActiveTab={setActiveTab}
          getDisplayStatus={getDisplayStatus}
          getDisplayCategory={getDisplayCategory}
          STATUS_BADGE={STATUS_BADGE}
          CAT_EMOJI={CAT_EMOJI}
        />
      )}

      {activeTab === 'submit-report' && (
        <TeacherSubmitReportTab
          pillarCategory={pillarCategory}
          setPillarCategory={setPillarCategory}
          reportTitle={reportTitle}
          setReportTitle={setReportTitle}
          notes={notes}
          setNotes={setNotes}
          observation={observation}
          setObservation={setObservation}
          selectedBuilding={selectedBuilding}
          setSelectedBuilding={setSelectedBuilding}
          roomNumber={roomNumber}
          setRoomNumber={setRoomNumber}
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          capturedImage={capturedImage}
          setCapturedImage={setCapturedImage}
          isCapturing={isCapturing}
          handleCapture={handleCapture}
          gpsCoords={gpsCoords}
          setGpsCoords={setGpsCoords}
          gpsLoading={gpsLoading}
          handleGPSDetect={handleGPSDetect}
          isSubmitting={isSubmitting}
          submitSuccess={submitSuccess}
          urgency={urgency}
          setUrgency={setUrgency}
          isPinningMode={isPinningMode}
          setIsPinningMode={setIsPinningMode}
          isCustomDebrisPin={isCustomDebrisPin}
          setIsCustomDebrisPin={setIsCustomDebrisPin}
          assignedLocationText={assignedLocationText}
          setAssignedLocationText={setAssignedLocationText}
          handleSubmit={handleSubmit}
          PILLAR_META={PILLAR_META}
          OBSERVATION_OPTIONS={OBSERVATION_OPTIONS}
          STEPS={STEPS}
          isWasteCategory={isWasteCategory}
          MAP_BOUNDS={MAP_BOUNDS}
          coordToPct={coordToPct}
        />
      )}

      {activeTab === 'bin-map' && (
        <TeacherBinMapTab
          bins={bins}
          selectedBinId={selectedBinId}
          setSelectedBinId={setSelectedBinId}
          activeBinDetail={activeBinDetail}
          isPinningMode={isPinningMode}
          setIsPinningMode={setIsPinningMode}
          isCustomDebrisPin={isCustomDebrisPin}
          setIsCustomDebrisPin={setIsCustomDebrisPin}
          gpsCoords={gpsCoords}
          setGpsCoords={setGpsCoords}
          assignedLocationText={assignedLocationText}
          setAssignedLocationText={setAssignedLocationText}
          updateBinLevel={updateBinLevel}
          toggleBinDispatch={toggleBinDispatch}
          MAP_BOUNDS={MAP_BOUNDS}
          coordToPct={coordToPct}
        />
      )}

      {activeTab === 'report-history' && (
        <TeacherReportHistoryTab
          timelineReports={timelineReports}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          getDisplayStatus={getDisplayStatus}
          getDisplayCategory={getDisplayCategory}
          STATUS_BADGE={STATUS_BADGE}
          STATUS_LEFT={STATUS_LEFT}
          CAT_EMOJI={CAT_EMOJI}
        />
      )}
    </div>
  );
};
