import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { WasteCategory } from '../../types';
import { Scale, Sparkles, Flame, Trash2 } from 'lucide-react';

// Sub-components
import { OverviewTab } from './components/OverviewTab';
import { SubmitReportTab } from './components/SubmitReportTab';
import { BinMapTab } from './components/BinMapTab';
import { ReportHistoryTab } from './components/ReportHistoryTab';
import { GamificationTab } from './components/GamificationTab';

export interface StudentSubmittedReportDetails {
  title: string;
  category: WasteCategory;
  location: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  imageUrl?: string | null;
  ticketId: string;
  timestamp: string;
}

interface StudentDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

const CATEGORY_META: Record<WasteCategory, { label: string; icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  RECYCLABLE: { label: 'Recyclable', icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100' },
  BIODEGRADABLE: { label: 'Biodegradable', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
  ORGANIC: { label: 'Organic', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
  HAZARDOUS: { label: 'Hazardous', icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
  GENERAL: { label: 'General', icon: Trash2, color: 'text-zinc-600', bg: 'bg-zinc-50/50', border: 'border-zinc-200' },
};

const URGENCY_META = {
  LOW: { label: 'Low', badge: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  MEDIUM: { label: 'Medium', badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  HIGH: { label: 'High', badge: 'bg-rose-50 text-rose-700 border-rose-200/60' },
};

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    users,
    reports,
    bins,
    challenges,
    offenses,
    createReport,
    settings,
    deductPoints,
    claimCertificate
  } = useMockData();

  // Form states
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [category, setCategory] = useState<WasteCategory>('RECYCLABLE');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [locationName, setLocationName] = useState('Cafeteria – Block A');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Map and subcategory states
  const [binId, setBinId] = useState<string | null>(null);
  const [isScatteredDebris, setIsScatteredDebris] = useState(false);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(2);

  // Tournament state controls
  const [isPeriodOver, setIsPeriodOver] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  // Filter personal reports
  const personalReports = reports.filter(r =>
    r.reporterId === currentUser?.id ||
    r.reporterName?.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  const mockImages: Record<WasteCategory, string> = {
    RECYCLABLE: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
    BIODEGRADABLE: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    NON_BIODEGRADABLE: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80',
    ORGANIC: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    HAZARDOUS: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    GENERAL: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80',
  };

  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setCapturedImage(mockImages[category] || mockImages.RECYCLABLE);
      setIsCapturing(false);
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCapturedImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [lastSubmittedReport, setLastSubmittedReport] = useState<StudentSubmittedReportDetails | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setTimeout(() => {
      const subcategoriesText = selectedMaterials.length > 0 
        ? `[Materials: ${selectedMaterials.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}]` 
        : '';
      const associatedBinText = binId ? `[Associated Bin ID: ${binId}]` : isScatteredDebris ? '[Scattered Debris Pin]' : `[Location: ${locationName}]`;
      const formattedDesc = `${associatedBinText} ${subcategoriesText} ${reportDesc}`.trim();
      const locToUse = isScatteredDebris ? 'Scattered Debris' : (locationName || 'Campus Station');
      const titleToUse = reportTitle || (isScatteredDebris ? 'Scattered Debris' : `Waste Report at ${locToUse}`);

      createReport({
        title: titleToUse,
        description: formattedDesc,
        category: category,
        urgency,
        locationName: locToUse,
        coordinates: gpsCoords || { lat: 14.6000, lng: 120.9850 },
        imageUrl: capturedImage || undefined,
        isScatteredDebris: isScatteredDebris,
      });

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setLastSubmittedReport({
        title: titleToUse,
        category: category,
        location: locToUse,
        urgency: urgency || 'MEDIUM',
        notes: reportDesc || '',
        imageUrl: capturedImage,
        ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: timeStr,
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Reset Form State
      setReportTitle('');
      setReportDesc('');
      setCapturedImage(null);
      setGpsCoords(null);
      setBinId(null);
      setIsScatteredDebris(false);
      setSelectedMaterials([]);
      setSliderValue(2);
      setUrgency('MEDIUM');
      setCategory('RECYCLABLE');
      setLocationName('');
    }, 1200);
  };

  if (!settings) return null;

  return (
    <div className="w-full">
      {activeTab === 'overview' && (
        <OverviewTab 
          currentUser={currentUser} 
          reports={reports} 
          offenses={offenses}
          settings={settings}
          setActiveTab={setActiveTab} 
        />
      )}

      {activeTab === 'submit-report' && (
        <SubmitReportTab
          currentUser={currentUser}
          bins={bins}
          reports={reports}
          settings={settings}
          setActiveTab={setActiveTab}
          createReport={createReport}
          reportTitle={reportTitle}
          setReportTitle={setReportTitle}
          reportDesc={reportDesc}
          setReportDesc={setReportDesc}
          category={category}
          setCategory={setCategory}
          urgency={urgency}
          setUrgency={setUrgency}
          locationName={locationName}
          setLocationName={setLocationName}
          isCapturing={isCapturing}
          handleCapture={handleCapture}
          capturedImage={capturedImage}
          setCapturedImage={setCapturedImage}
          handleFileChange={handleFileChange}
          gpsLoading={false}
          gpsCoords={gpsCoords}
          setGpsCoords={setGpsCoords}
          isSubmitting={isSubmitting}
          submitSuccess={submitSuccess}
          setSubmitSuccess={setSubmitSuccess}
          lastSubmittedReport={lastSubmittedReport}
          binId={binId}
          setBinId={setBinId}
          isScatteredDebris={isScatteredDebris}
          setIsScatteredDebris={setIsScatteredDebris}
          isPinningMode={isPinningMode}
          setIsPinningMode={setIsPinningMode}
          selectedMaterials={selectedMaterials}
          setSelectedMaterials={setSelectedMaterials}
          sliderValue={sliderValue}
          setSliderValue={setSliderValue}
          handleSubmit={handleSubmit}
        />
      )}

      {activeTab === 'bin-map' && (
        <BinMapTab
          bins={bins}
          reports={reports}
          setActiveTab={setActiveTab || (() => {})}
          setBinId={setBinId}
          setLocationName={setLocationName}
        />
      )}

      {activeTab === 'report-history' && (
        <ReportHistoryTab
          personalReports={personalReports}
          settings={settings}
          CATEGORY_META={CATEGORY_META}
          URGENCY_META={URGENCY_META}
        />
      )}

      {activeTab === 'gamification' && (
        <GamificationTab
          currentUser={currentUser}
          users={users}
          reports={reports}
          challenges={challenges}
          isPeriodOver={isPeriodOver}
          setIsPeriodOver={setIsPeriodOver}
          claimedSuccess={claimedSuccess}
          setClaimedSuccess={setClaimedSuccess}
          deductPoints={deductPoints}
          claimCertificate={claimCertificate}
          getAvatarColor={getAvatarColor}
        />
      )}
    </div>
  );
};
