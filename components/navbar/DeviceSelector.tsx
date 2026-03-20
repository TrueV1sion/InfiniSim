import React from 'react';
import { DeviceType } from '../../types';

interface DeviceSelectorProps {
  deviceType: DeviceType;
  onSetDeviceType: (dt: DeviceType) => void;
}

const DEVICES: { type: DeviceType; title: string; icon: JSX.Element }[] = [
  {
    type: 'desktop',
    title: 'Desktop',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'tablet',
    title: 'Tablet',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'mobile',
    title: 'Mobile',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'vr',
    title: 'VR',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'ar',
    title: 'AR',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ deviceType, onSetDeviceType }) => {
  return (
    <div className="flex items-center bg-[#111] rounded-lg p-0.5 border border-white/5">
      {DEVICES.map((d) => (
        <button
          key={d.type}
          onClick={() => onSetDeviceType(d.type)}
          className={`p-1.5 rounded-md transition-all ${
            deviceType === d.type
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title={d.title}
        >
          {d.icon}
        </button>
      ))}
    </div>
  );
};

export default DeviceSelector;
