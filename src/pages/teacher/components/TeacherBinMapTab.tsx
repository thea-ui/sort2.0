import React from 'react';
import { Bin, Report } from '../../../types';
import { BinMapTab } from '../../student/components/BinMapTab';

interface TeacherBinMapTabProps {
  bins: Bin[];
  reports?: Report[];
  setActiveTab?: (tab: string) => void;
  setBinId?: (id: string | null) => void;
  setLocationName?: (name: string) => void;
  [key: string]: any;
}

export const TeacherBinMapTab: React.FC<TeacherBinMapTabProps> = ({
  bins,
  reports = [],
  setActiveTab,
  setBinId,
  setLocationName,
}) => {
  return (
    <BinMapTab
      bins={bins}
      reports={reports}
      setActiveTab={setActiveTab}
      setBinId={setBinId}
      setLocationName={setLocationName}
    />
  );
};
