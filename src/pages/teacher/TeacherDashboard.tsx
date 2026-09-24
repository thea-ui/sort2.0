import React, { useState, useMemo } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Report } from '../../types';
import {
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
  FileText,
} from 'lucide-react';

// Sub-components matching StudentDashboard architecture
import { TeacherOverviewTab } from './components/TeacherOverviewTab';
import { TeacherSubmitReportTab } from './components/TeacherSubmitReportTab';
import { TeacherBinMapTab } from './components/TeacherBinMapTab';
import { TeacherReportHistoryTab } from './components/TeacherReportHistoryTab';
import { SubmittedReportDetails } from './components/TeacherSubmitSuccessView';

import { useSystemPresets } from '../../hooks/useSystemPresets';

type InfrastructurePillar = 'waste' | 'furniture' | 'electronics' | 'fixtures' | 'equipment' | 'other';
type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';

interface TeacherDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BASE_PILLAR_META: Record<InfrastructurePillar, { icon: React.ComponentType<any>; label: string; desc: string; accent: string; iconBg: string; iconText: string; border: string }> = {
  waste:       { icon: Recycle,  label: 'Waste / Bin',  desc: 'Litter issues, overflows',       accent: 'emerald', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-emerald-200' },
  furniture:   { icon: Armchair, label: 'Furniture',    desc: 'Desks, classroom chairs',         accent: 'amber',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   border: 'border-amber-200'   },
  electronics: { icon: Monitor,  label: 'Electronics',  desc: 'Projectors, display screens',     accent: 'sky',     iconBg: 'bg-[var(--primary)]/10',     iconText: 'text-[var(--text-strong)]',     border: 'border-[var(--primary)]/25'     },
  fixtures:    { icon: Zap,      label: 'Fixtures',     desc: 'AC fans, lights, switches',       accent: 'violet',  iconBg: 'bg-[var(--gold)]/10',  iconText: 'text-[var(--gold)]',  border: 'border-[var(--gold)]/25'  },
  equipment:   { icon: Wrench,   label: 'Equipment',    desc: 'Lab tool, janitorial asset',      accent: 'rose',    iconBg: 'bg-rose-50',    iconText: 'text-rose-600',    border: 'border-rose-200'    },
  other:       { icon: FileText, label: 'Other',        desc: 'General structural repair',       accent: 'zinc',    iconBg: 'bg-zinc-50',    iconText: 'text-[var(--text-strong)]',   border: 'border-zinc-200'    },
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
    createReport,
  } = useMockData();

  const { presetGroups, categories } = useSystemPresets();

  const PILLAR_META = useMemo(() => {
    const meta = { ...BASE_PILLAR_META };

    presetGroups.forEach((group) => {
      const codeKey = (group.code || group.category.toLowerCase()) as InfrastructurePillar;
      if (codeKey && meta[codeKey]) {
        meta[codeKey] = {
          ...meta[codeKey],
          label: group.category,
        };
      }
    });

    categories.forEach((cat) => {
      const codeKey = (cat.code || cat.name.toLowerCase()) as InfrastructurePillar;
      if (codeKey && meta[codeKey]) {
        meta[codeKey] = {
          ...meta[codeKey],
          label: cat.name,
        };
      }
    });

    return meta;
  }, [presetGroups, categories]);

  // Map state
  const [selectedBinId, setSelectedBinId] = useState<string | null>('bin-1');
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
  const [lastSubmittedReport, setLastSubmittedReport] = useState<SubmittedReportDetails | null>(null);
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Activity ledger filter
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // ── Derived counts ────────────────────────────────────────────────────
  const personalReports = reports.filter(r =>
    r.reporterId === currentUser.id ||
    r.reporterName?.toLowerCase() === currentUser.name?.toLowerCase()
  );

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
    setIsSubmitting(true);
    setTimeout(() => {
      const isWaste = pillarCategory === 'waste';

      let reportCat: BinCategory | 'GENERAL' = 'GENERAL';
      if (isWaste) {
        const t = (reportTitle || '').toUpperCase();
        if (t.includes('NON')) reportCat = 'NON_BIODEGRADABLE';
        else if (t.includes('BIO')) reportCat = 'BIODEGRADABLE';
        else if (t.includes('RECYC')) reportCat = 'RECYCLABLE';
        else reportCat = 'RECYCLABLE';
      }

      const pillarText   = `[Pillar: ${pillarCategory.toUpperCase()}]`;
      const obsText      = `[Observation: ${observation}]`;
      const pinText      = isCustomDebrisPin ? '[Custom Debris Pin]' : `[Location: ${selectedBuilding}]`;
      const formattedDesc = `${pillarText} ${obsText} ${pinText} ${notes}`.trim();
      const trimmedRoom = roomNumber.trim();
      const trimmedBuilding = selectedBuilding.trim();
      const buildingAndRoom = isCustomDebrisPin
        ? 'Scattered Debris'
        : (trimmedRoom && trimmedRoom !== trimmedBuilding ? `${trimmedBuilding} - ${trimmedRoom}` : trimmedBuilding);
      const titleToUse = reportTitle || (isCustomDebrisPin ? 'Scattered Debris' : (isWaste ? 'Waste Report' : `${pillarCategory.toUpperCase()} Infrastructure Issue`));

      createReport({
        title: titleToUse,
        description: formattedDesc,
        category: reportCat,
        urgency: urgency || 'MEDIUM',
        locationName: buildingAndRoom,
        coordinates: gpsCoords || { lat: 14.6000, lng: 120.9850 },
        imageUrl: capturedImage || undefined,
        reportType: isWaste ? 'WASTE' : 'ASSET',
      });

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setLastSubmittedReport({
        title: titleToUse,
        category: pillarCategory,
        location: buildingAndRoom,
        urgency: urgency || 'MEDIUM',
        observation: observation || 'Damaged',
        notes: notes || '',
        imageUrl: capturedImage,
        ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: timeStr,
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
    Verified:  'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
    Resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    Dismissed: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const STATUS_LEFT: Record<string, string> = {
    Pending:   'border-l-amber-400',
    Verified:  'border-l-indigo-400',
    Resolved:  'border-l-emerald-400',
    Dismissed: 'border-l-rose-400',
  };

  const timelineReports: Report[] = personalReports;

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
          setActiveTab={setActiveTab}
          getDisplayStatus={getDisplayStatus}
          getDisplayCategory={getDisplayCategory}
          STATUS_BADGE={STATUS_BADGE}
        />
      )}

      {activeTab === 'submit-report' && (
        <TeacherSubmitReportTab
          bins={bins}
          reports={reports}
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
          setSubmitSuccess={setSubmitSuccess}
          lastSubmittedReport={lastSubmittedReport}
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
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'bin-map' && (
        <TeacherBinMapTab
          bins={bins}
          reports={reports}
          setActiveTab={setActiveTab}
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
        />
      )}
    </div>
  );
};
