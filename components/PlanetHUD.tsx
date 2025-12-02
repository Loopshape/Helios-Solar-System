import React from 'react';
import { PlanetData } from '../types';
import ComparisonChart from './ComparisonChart';
import { X, Globe, Thermometer, Clock } from 'lucide-react';

interface PlanetHUDProps {
  planet: PlanetData | null;
  onClose: () => void;
}

const PlanetHUD: React.FC<PlanetHUDProps> = ({ planet, onClose }) => {
  if (!planet) return null;

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-md border border-gray-700 text-white p-6 rounded-xl shadow-2xl transition-all duration-300 transform animate-in fade-in slide-in-from-right-10 z-20">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-12 h-12 rounded-full shadow-inner border-2 border-white/20"
          style={{ backgroundColor: planet.color }}
        />
        <div>
          <h2 className="text-2xl font-bold tracking-wider">{planet.name.toUpperCase()}</h2>
          <span className="text-xs text-blue-400 font-mono">TYPE: CELESTIAL BODY</span>
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-6">
        {planet.description}
      </p>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 mb-1">
            <Globe size={12} /> Distance
          </div>
          <div className="text-white">{planet.distance === 0 ? '0' : planet.distance} AU (Rel)</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 mb-1">
            <Thermometer size={12} /> Temp
          </div>
          <div className="text-white">{planet.details.temp}</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 mb-1">
            <Clock size={12} /> Day Length
          </div>
          <div className="text-white">{planet.details.dayLength}</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 mb-1">
            <Clock size={12} /> Year Length
          </div>
          <div className="text-white">{planet.details.yearLength}</div>
        </div>
      </div>

      <ComparisonChart planet={planet} />
    </div>
  );
};

export default PlanetHUD;
