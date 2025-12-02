import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { PLANETS } from '../constants';
import { PlanetData } from '../types';
import { RotateCcw } from 'lucide-react';

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
  
  const moonRef = useRef<{ mesh: THREE.Mesh; angle: number; distance: number; speed: number } | null>(null);
  const cometRef = useRef<{ mesh: THREE.Mesh; tail: THREE.Points; velocity: THREE.Vector3; active: boolean; tailPositions: Float32Array } | null>(null);
  const sunEffectsRef = useRef<{ halos: THREE.Mesh[]; sprites: THREE.Sprite[] } | null>(null);
  const starFieldsRef = useRef<{ mesh: THREE.Points; material: THREE.ShaderMaterial }[]>([]);
  const asteroidsRef = useRef<THREE.Points | null>(null);
  const nebulaeRef = useRef<THREE.Points[]>([]);
  
  const animationFrameRef = useRef<number>(0);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-1, -1));
  const hoveredPlanetIdRef = useRef<string | null>(null);
  const labelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020205); 
    scene.fog = new THREE.FogExp2(0x020205, 0.002);

    // --- Camera ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 3000);
    cameraRef.current = camera;
    camera.position.set(0, 80, 160);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // --- Lighting ---
    const sunLight = new THREE.PointLight(0xffaa33, 3, 600);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.05); 
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x444466, 0x000000, 0.4);
    scene.add(hemisphereLight);

    // --- Textures & Materials ---
    const createParticleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const grad = ctx.createRadialGradient(32,32,0, 32,32,32);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,64,64);
        
        return new THREE.CanvasTexture(canvas);
    };

    const particleTexture = createParticleTexture();

    // --- 1. DYNAMIC NEBULAE ---
    const createNebula = (count: number, color: THREE.Color, range: number) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        
        for(let i=0; i<count; i++) {
             // Random cloud distribution
             const r = range + Math.random() * 100;
             const theta = Math.random() * Math.PI * 2;
             const phi = Math.random() * Math.PI;
             
             pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
             pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.5; // flatten slightly
             pos[i*3+2] = r * Math.cos(phi);
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            size: 60,
            color: color,
            map: particleTexture || undefined,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const mesh = new THREE.Points(geo, mat);
        scene.add(mesh);
        nebulaeRef.current.push(mesh);
    };
    
    // Add layers of nebulae
    createNebula(100, new THREE.Color(0x330055), 200); // Purple
    createNebula(100, new THREE.Color(0x002255), 250); // Blue

    // --- 2. ASTEROID BELT ---
    // Between Mars (30) and Jupiter (45)
    const asteroidCount = 1500;
    const asteroidGeo = new THREE.BufferGeometry();
    const asteroidPos = new Float32Array(asteroidCount * 3);
    const asteroidSizes = new Float32Array(asteroidCount);
    
    for(let i=0; i<asteroidCount; i++) {
        const r = 34 + Math.random() * 8; // Radius 34-42
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 1.5;
        
        asteroidPos[i*3] = r * Math.cos(theta);
        asteroidPos[i*3+1] = y;
        asteroidPos[i*3+2] = r * Math.sin(theta);
        
        asteroidSizes[i] = Math.random() * 0.4 + 0.1;
    }
    asteroidGeo.setAttribute('position', new THREE.BufferAttribute(asteroidPos, 3));
    asteroidGeo.setAttribute('size', new THREE.BufferAttribute(asteroidSizes, 1));
    
    const asteroidMat = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x888888) }
        },
        vertexShader: `
          attribute float size;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          void main() {
            if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: false
    });

    const asteroids = new THREE.Points(asteroidGeo, asteroidMat);
    scene.add(asteroids);
    asteroidsRef.current = asteroids;


    // --- 3. TWINKLING STAR FIELDS ---
    // Custom Shader for Twinkling
    const starVertexShader = `
        attribute float size;
        attribute float speed;
        attribute float brightness;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          float twinkle = sin(uTime * speed + position.x * 0.05);
          vAlpha = 0.5 + 0.5 * twinkle;
          vAlpha *= brightness;
        }
    `;

    const starFragmentShader = `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha) * tex;
        }
    `;

    const createTwinklingStars = (count: number, baseSize: number, radius: number) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const speeds = new Float32Array(count);
        const brightness = new Float32Array(count);
        
        for(let i=0; i<count; i++) {
            const r = radius + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i*3+2] = r * Math.cos(phi);
            
            sizes[i] = baseSize * (0.5 + Math.random());
            speeds[i] = 1.0 + Math.random() * 3.0;
            brightness[i] = 0.5 + Math.random() * 0.5;
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
        geo.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                pointTexture: { value: particleTexture }
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const mesh = new THREE.Points(geo, mat);
        scene.add(mesh);
        return { mesh, material: mat };
    };

    const starsBG = createTwinklingStars(5000, 3.0, 600);
    const starsFG = createTwinklingStars(2000, 4.0, 300);
    starFieldsRef.current = [starsBG, starsFG];

    // --- COMET SETUP ---
    const cometHeadGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const cometHeadMat = new THREE.MeshBasicMaterial({ color: 0xaaccff });
    const cometHead = new THREE.Mesh(cometHeadGeo, cometHeadMat);
    
    const tailCount = 100;
    const tailGeo = new THREE.BufferGeometry();
    const tailPos = new Float32Array(tailCount * 3);
    const tailSizes = new Float32Array(tailCount);
    
    for(let i=0; i<tailCount; i++) {
        tailSizes[i] = (1 - i/tailCount) * 3;
        tailPos[i*3] = 9999; 
    }
    
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
    tailGeo.setAttribute('size', new THREE.BufferAttribute(tailSizes, 1));
    
    const tailMat = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 2,
        transparent: true,
        opacity: 0.6,
        map: particleTexture || undefined,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const cometTail = new THREE.Points(tailGeo, tailMat);
    
    scene.add(cometHead);
    scene.add(cometTail);
    
    cometRef.current = {
        mesh: cometHead,
        tail: cometTail,
        velocity: new THREE.Vector3(0.5, 0, 0.2),
        active: false,
        tailPositions: new Float32Array(tailCount * 3)
    };
    cometHead.visible = false;
    cometTail.visible = false;

    // --- SUN EFFECTS ---
    const sunHalos: THREE.Mesh[] = [];
    const sunSprites: THREE.Sprite[] = [];
    const sunGeo = new THREE.SphereGeometry(5.2, 32, 32);
    const fireMat1 = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        wireframe: true,
    });
    const sunFire1 = new THREE.Mesh(sunGeo, fireMat1);
    scene.add(sunFire1);
    sunHalos.push(sunFire1);

    if (particleTexture) {
        const spriteMat = new THREE.SpriteMaterial({ 
            map: particleTexture, 
            color: 0xff5500, 
            transparent: true, 
            opacity: 0.6,
            blending: THREE.AdditiveBlending 
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(30, 30, 1);
        scene.add(sprite);
        sunSprites.push(sprite);
        
        const spriteMat2 = new THREE.SpriteMaterial({ 
            map: particleTexture, 
            color: 0xffdd44, 
            transparent: true, 
            opacity: 0.4,
            blending: THREE.AdditiveBlending 
        });
        const sprite2 = new THREE.Sprite(spriteMat2);
        sprite2.scale.set(15, 15, 1);
        scene.add(sprite2);
        sunSprites.push(sprite2);
    }
    sunEffectsRef.current = { halos: sunHalos, sprites: sunSprites };

    // --- PLANETS ---
    const textureLoader = new THREE.TextureLoader();

    planetsRef.current = PLANETS.map((planetData) => {
      const geometry = new THREE.SphereGeometry(planetData.radius, 64, 64);
      let material;
      const texture = planetData.textureUrl ? textureLoader.load(planetData.textureUrl) : null;
      const displayColor = texture ? 0xffffff : planetData.color;

      if (planetData.id === 'sun') {
        material = new THREE.MeshBasicMaterial({ 
          color: 0xffcc33,
          map: texture || undefined
        });
      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: displayColor,
          map: texture || undefined,
          roughness: 0.7,
          metalness: 0.2,
          emissive: new THREE.Color(planetData.color),
          emissiveIntensity: 0
        });

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
            
            group.userData = { id: planetData.id };
            scene.add(group);
            return {
                mesh: group as unknown as THREE.Mesh,
                data: planetData,
                angle: Math.random() * Math.PI * 2,
                orbitLine: createOrbit(planetData.distance, scene)
            };
        }
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { id: planetData.id };
      scene.add(mesh);

      if (planetData.id === 'earth') {
          const moonGeo = new THREE.SphereGeometry(planetData.radius * 0.27, 32, 32);
          const moonMat = new THREE.MeshStandardMaterial({
              color: 0x888888,
              roughness: 0.8
          });
          const moonMesh = new THREE.Mesh(moonGeo, moonMat);
          scene.add(moonMesh);
          moonRef.current = {
              mesh: moonMesh,
              angle: 0,
              distance: 4,
              speed: 0.05
          };
      }

      const orbitLine = createOrbit(planetData.distance, scene);
      return {
        mesh,
        data: planetData,
        angle: Math.random() * Math.PI * 2,
        orbitLine
      };
    });

    const raycaster = new THREE.Raycaster();

    const onPointerMove = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (event: MouseEvent) => {
        if (hoveredPlanetIdRef.current) {
            const found = PLANETS.find(p => p.id === hoveredPlanetIdRef.current);
            if (found) onPlanetSelect(found);
        }
    };

    mountRef.current.addEventListener('pointermove', onPointerMove);
    mountRef.current.addEventListener('pointerdown', onPointerDown);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Raycasting for Hover
      raycaster.setFromCamera(mouseRef.current, camera);
      const planetMeshes = planetsRef.current.map(p => p.mesh);
      const intersects = raycaster.intersectObjects(planetMeshes, true);
      
      let newHoveredId: string | null = null;
      if (intersects.length > 0) {
          let object = intersects[0].object;
          while(object.parent && object.parent.type !== 'Scene') {
              if (object.userData.id) break;
              object = object.parent;
          }
          newHoveredId = object.userData.id || (object.parent && object.parent.userData.id);
      }
      hoveredPlanetIdRef.current = newHoveredId;

      // Update Labels
      planetsRef.current.forEach(planet => {
          const el = labelRefs.current[planet.data.id];
          if (el) {
              const pos = planet.mesh.position.clone();
              pos.project(camera);

              // Check if visible
              const isVisible = pos.z < 1; // Not behind camera
              
              if (isVisible) {
                  const x = (pos.x * 0.5 + 0.5) * mountRef.current!.clientWidth;
                  const y = (-(pos.y * 0.5) + 0.5) * mountRef.current!.clientHeight;
                  
                  el.style.transform = `translate(${x}px, ${y}px)`;
                  // Show if hovered OR selected
                  const isActive = planet.data.id === hoveredPlanetIdRef.current || planet.data.id === selectedPlanetId;
                  el.style.opacity = isActive ? '1' : '0';
              } else {
                  el.style.opacity = '0';
              }
          }
      });


      // Rotate planets
      let earthPos = new THREE.Vector3();
      planetsRef.current.forEach((planet) => {
        if (planet.data.distance > 0) {
            planet.angle += planet.data.speed * 0.5;
            planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
            planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;
            if (planet.data.id === 'earth') earthPos.copy(planet.mesh.position);
        }
        planet.mesh.rotation.y += 0.005;
      });

      // Update Moon
      if (moonRef.current && earthPos) {
          moonRef.current.angle += moonRef.current.speed;
          moonRef.current.mesh.position.x = earthPos.x + Math.cos(moonRef.current.angle) * moonRef.current.distance;
          moonRef.current.mesh.position.z = earthPos.z + Math.sin(moonRef.current.angle) * moonRef.current.distance;
          moonRef.current.mesh.position.y = earthPos.y + Math.sin(moonRef.current.angle) * 1;
          moonRef.current.mesh.rotation.y += 0.01;
      }

      // Update Nebulae
      nebulaeRef.current.forEach((mesh, i) => {
          mesh.rotation.y += 0.0001 * (i % 2 === 0 ? 1 : -1);
      });

      // Update Asteroids
      if (asteroidsRef.current) {
          asteroidsRef.current.rotation.y += 0.0005;
      }

      // Update Stars (Twinkle + Parallax)
      starFieldsRef.current.forEach((sf, i) => {
          sf.mesh.rotation.y -= 0.0001 * (i + 1);
          sf.material.uniforms.uTime.value = elapsedTime;
      });
      
      // Update Sun Effects
      if (sunEffectsRef.current) {
          sunEffectsRef.current.sprites.forEach((sprite, i) => {
              const scaleBase = i === 0 ? 30 : 15;
              const scaleVar = Math.sin(elapsedTime * 2 + i) * 2;
              sprite.scale.set(scaleBase + scaleVar, scaleBase + scaleVar, 1);
              sprite.material.rotation += 0.002 * (i % 2 === 0 ? 1 : -1);
          });
          sunEffectsRef.current.halos.forEach((halo) => {
              halo.rotation.y -= 0.005;
              halo.rotation.z += 0.002;
              halo.scale.setScalar(1 + Math.sin(elapsedTime * 4) * 0.02);
          });
      }

      // Update Comet
      if (cometRef.current) {
          const comet = cometRef.current;
          if (!comet.active && Math.random() < 0.002) {
              comet.active = true;
              comet.mesh.visible = true;
              comet.tail.visible = true;
              const angle = Math.random() * Math.PI * 2;
              const r = 200;
              comet.mesh.position.set(Math.cos(angle) * r, Math.random() * 50 - 25, Math.sin(angle) * r);
              const target = new THREE.Vector3(Math.random()*40-20, 0, Math.random()*40-20);
              const dir = new THREE.Vector3().subVectors(target, comet.mesh.position).normalize();
              comet.velocity.copy(dir).multiplyScalar(0.8 + Math.random() * 0.5);
              for(let i=0; i<comet.tailPositions.length; i++) comet.tailPositions[i] = comet.mesh.position.toArray()[i%3];
          }

          if (comet.active) {
              comet.mesh.position.add(comet.velocity);
              const positions = comet.tail.geometry.attributes.position.array as Float32Array;
              for (let i = positions.length - 1; i >= 3; i--) positions[i] = positions[i - 3];
              positions[0] = comet.mesh.position.x;
              positions[1] = comet.mesh.position.y;
              positions[2] = comet.mesh.position.z;
              comet.tail.geometry.attributes.position.needsUpdate = true;
              if (comet.mesh.position.length() > 250) {
                  comet.active = false;
                  comet.mesh.visible = false;
                  comet.tail.visible = false;
              }
          }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mountRef.current) {
        mountRef.current.removeEventListener('pointermove', onPointerMove);
        mountRef.current.removeEventListener('pointerdown', onPointerDown);
        if (rendererRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        }
      }
    };
  }, []); 

  // --- Handle Planet Selection ---
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    planetsRef.current.forEach(p => {
        gsap.to(p.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
        if (p.mesh instanceof THREE.Mesh && p.mesh.material instanceof THREE.MeshStandardMaterial) {
            gsap.to(p.mesh.material, { emissiveIntensity: 0, duration: 0.5 });
        } else if (p.mesh.type === 'Group') {
            const planetMesh = p.mesh.children[0] as THREE.Mesh;
            if (planetMesh.material instanceof THREE.MeshStandardMaterial) {
                gsap.to(planetMesh.material, { emissiveIntensity: 0, duration: 0.5 });
            }
        }
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

        gsap.to(controlsRef.current.target, {
            x: x, y: y, z: z, duration: 1.5, ease: "power2.inOut"
        });
        gsap.to(cameraRef.current.position, {
            x: x + offset, y: y + offset * 0.5, z: z + offset,
            duration: 1.5, ease: "power2.inOut",
            onUpdate: () => controlsRef.current?.update()
        });

        gsap.fromTo(targetPlanet.mesh.scale, 
            { x: 1, y: 1, z: 1 },
            { x: 1.2, y: 1.2, z: 1.2, duration: 0.6, yoyo: true, repeat: 3, ease: "sine.inOut" }
        );

        if (targetPlanet.data.id !== 'sun') {
             let mat;
             if (targetPlanet.mesh instanceof THREE.Mesh) mat = targetPlanet.mesh.material as THREE.MeshStandardMaterial;
             else mat = (targetPlanet.mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
             if (mat) {
                 gsap.to(mat, { emissiveIntensity: 0.5, duration: 0.8, ease: "power2.out" });
             }
        }

        if (targetPlanet.orbitLine) {
            const mat = targetPlanet.orbitLine.material as THREE.LineDashedMaterial;
            mat.color.setHex(0x60a5fa);
            gsap.fromTo(mat, 
                { opacity: 0.15 },
                { opacity: 0.8, duration: 0.6, yoyo: true, repeat: 3, ease: "sine.inOut",
                  onComplete: () => { gsap.to(mat, { opacity: 0.3, duration: 0.5 }); }
                }
            );
        }
    }
  }, [selectedPlanetId]);

  // Resize Handler
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

  const handleResetCamera = () => {
    if(!cameraRef.current || !controlsRef.current) return;
    
    gsap.to(cameraRef.current.position, {
        x: 0, y: 80, z: 160, duration: 2, ease: "power2.inOut"
    });
    gsap.to(controlsRef.current.target, {
        x: 0, y: 0, z: 0, duration: 2, ease: "power2.inOut",
        onUpdate: () => controlsRef.current?.update()
    });
  };

  return (
    <div ref={mountRef} className="w-full h-full relative">
        {/* Reset Camera Button */}
        <button 
            onClick={handleResetCamera}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full hover:bg-white/20 transition-all text-white z-10 group"
            title="Reset View"
        >
            <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500"/>
        </button>

        {/* Planet Labels */}
        {PLANETS.map(p => (
            <div 
                key={p.id} 
                ref={el => labelRefs.current[p.id] = el}
                className="absolute text-white text-[10px] md:text-xs font-bold pointer-events-none transition-opacity duration-300 uppercase tracking-widest"
                style={{ 
                    opacity: 0, 
                    textShadow: '0 0 4px #000, 0 0 8px #000', 
                    top: 0, left: 0,
                    transform: 'translate(-50%, -100%)', // Centered above
                    marginTop: '-10px'
                }}
            >
                {p.name}
            </div>
        ))}
    </div>
  );
};

function createOrbit(radius: number, scene: THREE.Scene): THREE.Line | undefined {
    if (radius <= 0) return undefined;
    const segments = 128;
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
    orbit.computeLineDistances();
    scene.add(orbit);
    return orbit;
}

export default SolarSystem;