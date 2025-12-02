export interface PlanetData {
  id: string;
  name: string;
  color: string;
  radius: number; // Relative size
  distance: number; // Distance from sun
  speed: number; // Orbital speed
  description: string;
  textureUrl?: string;
  details: {
    gravity: number; // m/s²
    dayLength: string;
    yearLength: string;
    temp: string;
  };
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
