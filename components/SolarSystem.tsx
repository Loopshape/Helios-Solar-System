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
    scene.background = new THREE.Color(0x020205); // Very dark blue-black
    // Fog for depth
    scene.fog = new THREE.FogExp2(0x020205, 0.0015);

    // --- Camera ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000); // Increased far plane
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
    controls.maxDistance = 400; // Allow zooming out further to see galaxy
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.05); 
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

    // --- Helper: Create Particle Texture ---
    const createParticleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const grad = ctx.createRadialGradient(16,16,0, 16,16,16);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.2, "rgba(255,255,255,0.8)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,32,32);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    };

    const particleTexture = createParticleTexture();

    // --- Background 1: Distant Stars ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for(let i=0; i<starCount; i++) {
        const i3 = i * 3;
        // Distribute in a large sphere
        const r = 500 + Math.random() * 1000; 
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        starPos[i3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i3+2] = r * Math.cos(phi);

        // Color variation
        const colorType = Math.random();
        let color = new THREE.Color();
        if (colorType > 0.9) color.setHex(0xaaaaaa); // White
        else if (colorType > 0.7) color.setHex(0xffdddd); // Red
        else if (colorType > 0.5) color.setHex(0xccccff); // Blue
        else color.setHex(0xffffff);

        starColors[i3] = color.r;
        starColors[i3+1] = color.g;
        starColors[i3+2] = color.b;

        starSizes[i] = Math.random() * 2;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        map: particleTexture || undefined,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- Background 2: Galaxy Spiral ---
    const galaxyGeo = new THREE.BufferGeometry();
    const galaxyCount = 15000;
    const galaxyRadius = 400;
    const branches = 5;
    const spin = 1.5; // How much it twists
    const randomness = 0.5;
    const randomnessPower = 3;
    const insideColor = new THREE.Color(0xff6030); // Orange/Red core
    const outsideColor = new THREE.Color(0x1b3984); // Blue outer arms

    const galaxyPos = new Float32Array(galaxyCount * 3);
    const galaxyCols = new Float32Array(galaxyCount * 3);

    for(let i=0; i<galaxyCount; i++) {
        const i3 = i * 3;

        // Radius
        const r = Math.random() * galaxyRadius;
        
        // Spin angle based on radius
        const spinAngle = r * spin * 0.01; // Scaled down spin
        
        // Branch angle
        const branchAngle = (i % branches) / branches * Math.PI * 2;

        // Randomness for thickness/scatter
        const randomX = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
        const randomY = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r * 0.5; // Flattened Y
        const randomZ = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

        galaxyPos[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
        galaxyPos[i3+1] = randomY - 50; // Shift down slightly
        galaxyPos[i3+2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

        // Color Mixing
        const mixedColor = insideColor.clone();
        mixedColor.lerp(outsideColor, r / galaxyRadius);

        galaxyCols[i3] = mixedColor.r;
        galaxyCols[i3+1] = mixedColor.g;
        galaxyCols[i3+2] = mixedColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galaxyPos, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(galaxyCols, 3));

    const galaxyMat = new THREE.PointsMaterial({
        size: 2.5,
        vertexColors: true,
        map: particleTexture || undefined,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.5
    });

    const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
    // Orient galaxy to be visible in background
    galaxy.rotation.x = Math.PI / 8;
    galaxy.position.y = -100;
    galaxy.scale.set(1.5, 1.5, 1.5); // Make it huge
    scene.add(galaxy);

    // --- Create Planets ---
    const textureLoader = new THREE.TextureLoader();

    planetsRef.current = PLANETS.map((planetData) => {
      // 1. Geometry & Material
      const geometry = new THREE.SphereGeometry(planetData.radius, 64, 64);
      let material;
      
      const texture = planetData.textureUrl ? textureLoader.load(planetData.textureUrl) : null;
      // Use white if texture is present to avoid tinting
      const displayColor = texture ? 0xffffff : planetData.color;

      if (planetData.id === 'sun') {
        material = new THREE.MeshBasicMaterial({ 
          color: displayColor,
          map: texture || undefined
        });
        // Add glow to sun
        const glowGeo = new THREE.SphereGeometry(planetData.radius * 1.3, 64, 64);
        const glowMat = new THREE.MeshBasicMaterial({ color: planetData.color, transparent: true, opacity: 0.25, side: THREE.BackSide });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glowMesh);
        
        // Add point light glow sprite
        if (particleTexture) {
             const spriteMat = new THREE.SpriteMaterial({ 
                 map: particleTexture, 
                 color: planetData.color, 
                 transparent: true, 
                 opacity: 0.8,
                 blending: THREE.AdditiveBlending 
             });
             const sprite = new THREE.Sprite(spriteMat);
             sprite.scale.set(planetData.radius * 6, planetData.radius * 6, 1);
             scene.add(sprite);
        }

      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: displayColor,
          map: texture || undefined,
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
      
      // Slowly rotate the galaxy
      galaxy.rotation.y += 0.0002;
      starField.rotation.y -= 0.0001;

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
    if (!cameraRef.current || !controlsRef.current) return;

    // 1. Reset all planets to default state first
    planetsRef.current.forEach(p => {
        // Kill existing tweens on this object
        gsap.killTweensOf(p.mesh.scale);
        if (p.orbitLine) gsap.killTweensOf(p.orbitLine.material);

        // Smoothly reset scale to 1
        gsap.to(p.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5 });

        // Smoothly reset orbit opacity
        if (p.orbitLine) {
            const mat = p.orbitLine.material as THREE.LineDashedMaterial;
            gsap.to(mat, { opacity: 0.15, duration: 0.5 });
            mat.color.setHex(0xffffff);
        }
    });

    if (!selectedPlanetId) return;

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

        // --- NEW: Pulse Animation for selected planet ---
        gsap.fromTo(targetPlanet.mesh.scale, 
            { x: 1, y: 1, z: 1 },
            { 
                x: 1.3, y: 1.3, z: 1.3, 
                duration: 0.6, 
                yoyo: true, 
                repeat: 3, 
                ease: "sine.inOut" 
            }
        );

        // --- NEW: Highlight Orbit Line ---
        if (targetPlanet.orbitLine) {
            const mat = targetPlanet.orbitLine.material as THREE.LineDashedMaterial;
            mat.color.setHex(0x60a5fa); // Bright blue highlight
            gsap.fromTo(mat, 
                { opacity: 0.15 },
                { 
                    opacity: 0.8, 
                    duration: 0.6, 
                    yoyo: true, 
                    repeat: 3,
                    ease: "sine.inOut",
                    onComplete: () => {
                         // Settle at a slightly visible state after pulse
                         gsap.to(mat, { opacity: 0.3, duration: 0.5 });
                    }
                }
            );
        }
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
    const segments = 128; // Increased segments for smoother orbits
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      linewidth: 1,
      scale: 1,
      dashSize: 3,
      gapSize: 2,
      opacity: 0.15,
      transparent: true
    });
    
    const orbit = new THREE.Line(geometry, material);
    orbit.computeLineDistances(); // Required for LineDashedMaterial
    
    scene.add(orbit);
    return orbit;
}

export default SolarSystem;