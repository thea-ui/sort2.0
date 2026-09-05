import React from 'react';
import { BinStatus, Report } from '../../../types';
import { CampusLiveMapView } from './map/CampusLiveMapView';

export interface AdminBinMapTabProps {
  bins?: BinStatus[];
  reports?: Report[];
}

export const AdminBinMapTab: React.FC<AdminBinMapTabProps> = ({ bins, reports }) => {
  return <CampusLiveMapView bins={bins} reports={reports} />;
};
