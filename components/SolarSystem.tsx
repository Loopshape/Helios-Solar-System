import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { PLANETS } from '../constants';
import { PlanetData } from '../types';

interface SolarSystemProps {
  onPlanetSelect: (planet: PlanetData) => void;
  selectedPlanetId: string | null;
}

const SolarSystem: React.FC<SolarSystemProps> = ({ onPlanetSelect, selectedPlanetId }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetsRef = useRef<{ mesh: THREE.Mesh; data: PlanetData; angle: number; orbitLine?: THREE.Line }[]>([]);
  const animationFrameRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050510);
    // Fog for depth
    scene.fog = new THREE.FogExp2(0x050510, 0.002);

    // --- Camera ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 60, 120);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Enable shadow map for better depth if needed, though simple planets might not need it
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controlsRef.current = controls;

    controls.addEventListener('start', () => { isInteractingRef.current = true; });
    controls.addEventListener('end', () => { isInteractingRef.current = false; });

    // --- Lights ---
    // 1. Central Sun Light (Point Light)
    // The main source of light in the system
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 400);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // 2. Ambient Light
    // Low intensity base light to prevent pitch black shadows
    const ambientLight = new THREE.AmbientLight(0x404040, 0.1); 
    scene.add(ambientLight);

    // 3. Hemisphere Light
    // Simulates complex environmental light (Sky vs Ground)
    // Gives a nice cool tint to the shadows (space environment)
    const hemisphereLight = new THREE.HemisphereLight(0x2a2a35, 0x000000, 0.5);
    scene.add(hemisphereLight);

    // 4. Directional Lights
    // Add subtle fill/rim lighting from distant sources (e.g. galactic core)
    const dirLightMain = new THREE.DirectionalLight(0xffffff, 0.2);
    dirLightMain.position.set(100, 50, 100);
    scene.add(dirLightMain);

    // Cooler fill light from opposite side
    const dirLightFill = new THREE.DirectionalLight(0x4444ff, 0.15);
    dirLightFill.position.set(-100, -50, -100);
    scene.add(dirLightFill);

    // --- Starfield Background ---
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 600;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);


    // --- Create Planets ---
    planetsRef.current = PLANETS.map((planetData) => {
      // 1. Geometry & Material
      const geometry = new THREE.SphereGeometry(planetData.radius, 32, 32);
      let material;
      
      if (planetData.id === 'sun') {
        material = new THREE.MeshBasicMaterial({ 
          color: planetData.color,
        });
        // Add glow to sun
        const glowGeo = new THREE.SphereGeometry(planetData.radius * 1.2, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: planetData.color, transparent: true, opacity: 0.3, side: THREE.BackSide });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glowMesh);
      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: planetData.color,
          roughness: 0.7,
          metalness: 0.2, // Increased metalness slightly for better light interaction
        });
        
        // Ring for Saturn
        if (planetData.id === 'saturn') {
            const ringGeo = new THREE.RingGeometry(planetData.radius * 1.4, planetData.radius * 2.2, 64);
            const ringMat = new THREE.MeshStandardMaterial({ 
                color: 0xaa8844, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.8,
                roughness: 0.5,
                metalness: 0.1
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            const group = new THREE.Group();
            const planetMesh = new THREE.Mesh(geometry, material);
            group.add(planetMesh);
            group.add(ring);
            
            // Adjust group so we treat it like a mesh for positioning logic
            // Hacky swap: store group as 'mesh'
            group.userData = { id: planetData.id };
            scene.add(group);
            return {
                mesh: group as unknown as THREE.Mesh, // Casting for simplicity in TS
                data: planetData,
                angle: Math.random() * Math.PI * 2,
                orbitLine: createOrbit(planetData.distance, scene)
            };
        }
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { id: planetData.id };
      scene.add(mesh);

      // Create orbit line
      const orbitLine = createOrbit(planetData.distance, scene);

      return {
        mesh,
        data: planetData,
        angle: Math.random() * Math.PI * 2, // Random start angle
        orbitLine
      };
    });

    // --- Raycaster ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
        // Prevent click if dragging orbit controls
        let clientX, clientY;
        if (window.TouchEvent && event instanceof TouchEvent) {
             clientX = event.touches[0].clientX;
             clientY = event.touches[0].clientY;
        } else if (event instanceof MouseEvent) {
             clientX = event.clientX;
             clientY = event.clientY;
        } else {
            return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Filter meshes to intersect (only planets)
        const planetMeshes = planetsRef.current.map(p => p.mesh);
        const intersects = raycaster.intersectObjects(planetMeshes, true); // true for recursive (groups)

        if (intersects.length > 0) {
            // Find the root object that has user data
            let object = intersects[0].object;
            while(object.parent && object.parent.type !== 'Scene') {
                if (object.userData.id) break;
                object = object.parent;
            }

            const planetId = object.userData.id || (object.parent && object.parent.userData.id);
            const found = PLANETS.find(p => p.id === planetId);
            if (found) {
                onPlanetSelect(found);
            }
        }
    };

    mountRef.current.addEventListener('pointerdown', onPointerDown);

    // --- Animation Loop ---
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Rotate planets
      planetsRef.current.forEach((planet) => {
        if (planet.data.distance > 0) {
            planet.angle += planet.data.speed * 0.5; // Scale speed for visuals
            planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
            planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;
        }
        
        // Self rotation
        planet.mesh.rotation.y += 0.005;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mountRef.current) {
        mountRef.current.removeEventListener('pointerdown', onPointerDown);
        if (rendererRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- Handle Planet Selection & Camera Transition ---
  useEffect(() => {
    if (!selectedPlanetId || !cameraRef.current || !controlsRef.current) return;

    const targetPlanet = planetsRef.current.find(p => p.data.id === selectedPlanetId);
    if (targetPlanet) {
        const { x, y, z } = targetPlanet.mesh.position;
        const radius = targetPlanet.data.radius;
        const offset = Math.max(radius * 4, 10); 

        // Animate Camera to look at planet
        // We move camera to a position offset from the planet
        // We move controls target to the planet
        
        gsap.to(controlsRef.current.target, {
            x: x,
            y: y,
            z: z,
            duration: 1.5,
            ease: "power2.inOut"
        });

        gsap.to(cameraRef.current.position, {
            x: x + offset,
            y: y + offset * 0.5,
            z: z + offset,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => controlsRef.current?.update()
        });
    } else {
        // Reset to default view if selection cleared (optional, currently not triggered by UI)
    }
  }, [selectedPlanetId]);

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

function createOrbit(radius: number, scene: THREE.Scene): THREE.Line | undefined {
    if (radius <= 0) return undefined;
    const segments = 64;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 });
    const orbit = new THREE.Line(geometry, material);
    scene.add(orbit);
    return orbit;
}

export default SolarSystem;