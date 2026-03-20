import React from 'react';
import { BrowserEra } from '../../types';

interface EraSelectorProps {
  browserEra: BrowserEra;
  onSetBrowserEra: (era: BrowserEra) => void;
}

const ERAS: { value: BrowserEra; label: string }[] = [
  { value: 'default', label: 'Modern' },
  { value: '1990', label: '1990' },
  { value: '1995', label: '1995' },
  { value: '1999', label: '1999' },
  { value: '2001', label: '2001' },
  { value: '2005', label: '2005' },
  { value: '2010', label: '2010' },
  { value: '2015', label: '2015' },
  { value: '2020', label: '2020' },
  { value: '2025', label: '2025' },
  { value: '2030', label: '2030' },
  { value: '2035', label: '2035' },
];

const EraSelector: React.FC<EraSelectorProps> = ({ browserEra, onSetBrowserEra }) => {
  return (
    <div className="flex items-center bg-[#111] rounded-lg border border-white/5">
      <select
        value={browserEra}
        onChange={(e) => onSetBrowserEra(e.target.value as BrowserEra)}
        className="bg-transparent text-[10px] font-bold text-gray-400 hover:text-white outline-none cursor-pointer px-2 py-1.5 appearance-none pr-5"
        title="Browser Era"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
      >
        {ERAS.map((era) => (
          <option key={era.value} value={era.value}>{era.label}</option>
        ))}
      </select>
    </div>
  );
};

export default EraSelector;
