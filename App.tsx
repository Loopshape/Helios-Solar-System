import React, { useState } from 'react';
import SolarSystem from './components/SolarSystem';
import PlanetHUD from './components/PlanetHUD';
import { PlanetData } from './types';
import { Info } from 'lucide-react';

const App: React.FC = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const handlePlanetSelect = (planet: PlanetData) => {
    setSelectedPlanet(planet);
    setShowIntro(false);
  };

  const handleCloseHUD = () => {
    setSelectedPlanet(null);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <SolarSystem 
          onPlanetSelect={handlePlanetSelect} 
          selectedPlanetId={selectedPlanet?.id || null} 
        />
      </div>

      {/* Intro Overlay */}
      {showIntro && (
        <div className="absolute bottom-10 left-10 max-w-sm pointer-events-none z-10 animate-pulse">
           <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            HELIOS 3D
          </h1>
          <p className="text-gray-400 text-sm">
            Interactive WebGL Solar System. <br/>
            Drag to rotate. Scroll to zoom. Click a planet to investigate.
          </p>
        </div>
      )}

      {/* Info Button (Top Left) */}
      <div className="absolute top-4 left-4 z-10">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all border border-white/10"
          onClick={() => setShowIntro(!showIntro)}
        >
          <Info size={16} />
          <span className="text-xs font-bold tracking-widest">CONTROLS</span>
        </button>
      </div>

      {/* Planet HUD */}
      <PlanetHUD planet={selectedPlanet} onClose={handleCloseHUD} />
      
      {/* Signature */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-600 z-0 pointer-events-none">
        Powered by React Three Fiber & GSAP
      </div>
    </div>
  );
};

export default App;
