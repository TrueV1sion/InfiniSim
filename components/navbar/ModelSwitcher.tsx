import React from 'react';
import { ModelTier } from '../../types';

interface ModelSwitcherProps {
  model: ModelTier;
  onSetModel: (model: ModelTier) => void;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ model, onSetModel }) => {
  return (
    <div className="flex items-center bg-[#111] rounded-lg p-0.5 border border-white/5">
      <button
        onClick={() => onSetModel(ModelTier.FLASH)}
        className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all ${
          model === ModelTier.FLASH
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        Flash
      </button>
      <button
        onClick={() => onSetModel(ModelTier.PRO)}
        className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all flex items-center gap-1 ${
          model === ModelTier.PRO
            ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        Pro
        <div className="flex gap-0.5">
          <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
          <span className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '75ms' }}></span>
        </div>
      </button>
    </div>
  );
};

export default ModelSwitcher;
