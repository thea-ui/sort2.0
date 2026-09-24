export interface PresetItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PresetGroup {
  category: string;
  items: PresetItem[];
}

export const DEFAULT_PRESET_GROUPS: PresetGroup[] = [
  {
    category: 'Furniture',
    items: [
      { id: 'f-1', name: 'Arm Chair (Plastic)', enabled: true },
      { id: 'f-2', name: 'Arm Chair (Wooden)', enabled: true },
      { id: 'f-3', name: 'Office Chair', enabled: true },
      { id: 'f-4', name: 'Student Desk', enabled: true },
      { id: 'f-5', name: "Teacher's Table", enabled: true },
      { id: 'f-6', name: 'Wooden Table', enabled: true },
      { id: 'f-7', name: 'Filing Cabinet', enabled: true },
      { id: 'f-8', name: 'Bookshelf', enabled: true },
      { id: 'f-9', name: 'Whiteboard Stand', enabled: true },
      { id: 'f-10', name: 'Lecture Podium', enabled: true },
    ],
  },
  {
    category: 'Electronics',
    items: [
      { id: 'e-1', name: 'Desktop Computer', enabled: true },
      { id: 'e-2', name: 'Laptop', enabled: true },
      { id: 'e-3', name: 'LCD Projector', enabled: true },
      { id: 'e-4', name: 'LED TV/Monitor', enabled: true },
      { id: 'e-5', name: 'Speaker / PA Sound System', enabled: true },
      { id: 'e-6', name: 'Printer / Scanner', enabled: true },
      { id: 'e-7', name: 'Wireless Router / Access Point', enabled: true },
      { id: 'e-8', name: 'Document Camera', enabled: true },
    ],
  },
  {
    category: 'Fixtures',
    items: [
      { id: 'fx-1', name: 'Ceiling Fan', enabled: true },
      { id: 'fx-2', name: 'Air Conditioner Unit (Split/Window)', enabled: true },
      { id: 'fx-3', name: 'LED Tube Light / Panel Light', enabled: true },
      { id: 'fx-4', name: 'Wall Light Switch', enabled: true },
      { id: 'fx-5', name: 'Electrical Power Outlet', enabled: true },
      { id: 'fx-6', name: 'Door Lock / Handle Assembly', enabled: true },
      { id: 'fx-7', name: 'Window Blinds / Curtain Rod', enabled: true },
      { id: 'fx-8', name: 'Plumbing Faucet / Sink Assembly', enabled: true },
    ],
  },
  {
    category: 'Equipment',
    items: [
      { id: 'eq-1', name: 'Science Microscope', enabled: true },
      { id: 'eq-2', name: 'Bunsen Burner / Gas Hose', enabled: true },
      { id: 'eq-3', name: 'Laboratory Centrifuge', enabled: true },
      { id: 'eq-4', name: 'Fire Extinguisher (CO2/Dry Chemical)', enabled: true },
      { id: 'eq-5', name: 'First Aid Kit Box', enabled: true },
      { id: 'eq-6', name: 'Oscilloscope / Multimeter', enabled: true },
      { id: 'eq-7', name: 'Paper Shredder Machine', enabled: true },
    ],
  },
  {
    category: 'Other',
    items: [
      { id: 'ot-1', name: 'Trash Can / Litter Bin (General)', enabled: true },
      { id: 'ot-2', name: 'Whiteboard / Cork Board', enabled: true },
      { id: 'ot-3', name: 'Cleaning Broom / Mop Stand', enabled: true },
      { id: 'ot-4', name: 'Extension Cord Wheel', enabled: true },
      { id: 'ot-5', name: 'Wall Clock (Analog/Digital)', enabled: true },
    ],
  },
];
