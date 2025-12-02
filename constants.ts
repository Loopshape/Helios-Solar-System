import { PlanetData } from './types';

export const PLANETS: PlanetData[] = [
  {
    id: 'sun',
    name: 'Sun',
    color: '#fbbf24', // Amber-400
    radius: 5,
    distance: 0,
    speed: 0,
    description: 'The star around which the earth orbits.',
    details: { gravity: 274, dayLength: '-', yearLength: '-', temp: '5500°C' }
  },
  {
    id: 'mercury',
    name: 'Mercury',
    color: '#a3a3a3', // Neutral-400
    radius: 0.8,
    distance: 10,
    speed: 0.02,
    description: 'The smallest planet in the Solar System and the closest to the Sun.',
    details: { gravity: 3.7, dayLength: '58.6d', yearLength: '88d', temp: '167°C' }
  },
  {
    id: 'venus',
    name: 'Venus',
    color: '#fde047', // Yellow-300
    radius: 1.5,
    distance: 15,
    speed: 0.015,
    description: 'The second planet from the Sun. It has a thick atmosphere.',
    details: { gravity: 8.87, dayLength: '243d', yearLength: '225d', temp: '464°C' }
  },
  {
    id: 'earth',
    name: 'Earth',
    color: '#3b82f6', // Blue-500
    radius: 1.6,
    distance: 22,
    speed: 0.01,
    description: 'Our home, the third planet from the Sun.',
    details: { gravity: 9.8, dayLength: '24h', yearLength: '365.25d', temp: '15°C' }
  },
  {
    id: 'mars',
    name: 'Mars',
    color: '#ef4444', // Red-500
    radius: 1.2,
    distance: 30,
    speed: 0.008,
    description: 'The fourth planet from the Sun and the second-smallest planet.',
    details: { gravity: 3.71, dayLength: '24h 37m', yearLength: '687d', temp: '-63°C' }
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: '#d97706', // Amber-600
    radius: 3.5,
    distance: 45,
    speed: 0.004,
    description: 'The largest planet in the Solar System.',
    details: { gravity: 24.79, dayLength: '9h 56m', yearLength: '12y', temp: '-108°C' }
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: '#eab308', // Yellow-500
    radius: 3,
    distance: 60,
    speed: 0.003,
    description: 'The sixth planet from the Sun and the second-largest planet.',
    details: { gravity: 10.44, dayLength: '10h 42m', yearLength: '29y', temp: '-139°C' }
  },
  {
    id: 'uranus',
    name: 'Uranus',
    color: '#22d3ee', // Cyan-400
    radius: 2.2,
    distance: 75,
    speed: 0.002,
    description: 'The seventh planet from the Sun.',
    details: { gravity: 8.69, dayLength: '17h 14m', yearLength: '84y', temp: '-197°C' }
  },
  {
    id: 'neptune',
    name: 'Neptune',
    color: '#3b82f6', // Blue-600
    radius: 2.1,
    distance: 90,
    speed: 0.001,
    description: 'The eighth and farthest-known Solar planet from the Sun.',
    details: { gravity: 11.15, dayLength: '16h 6m', yearLength: '165y', temp: '-201°C' }
  },
];
