import React from 'react';
import { BinStatus, Report } from '../../../types';
import { CampusLiveMapView } from '../../admin/components/map/CampusLiveMapView';

interface MRFBinMapTabProps {
  bins?: BinStatus[];
  reports?: Report[];
}

/** MRF live bin map — same campus map admins edit in Settings → Locations. */
export const MRFBinMapTab: React.FC<MRFBinMapTabProps> = ({ bins, reports }) => (
  <CampusLiveMapView bins={bins} reports={reports} />
);
