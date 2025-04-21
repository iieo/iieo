import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Drip {
    mesh: THREE.Mesh;
    width: number;
    currentLength: number;
    growthRate: number;
    maxLength: number;
    active: boolean;
    nextDropTime: number;
    timeSinceLastDrop: number;
    xPosition: number;
    yStart: number;
    viscosity: number;
    oscillationFrequency: number;
    surfaceTensionStrength: number;
}

interface Droplet {
    mesh: THREE.Mesh;
    speed: number;
    acceleration: number;
    oscillationAmount: number;
    oscillationSpeed: number;
    size: number;
    age: number;
    xVelocity?: number;
}

interface Thread {
    mesh: THREE.Mesh;
    lifespan: number;
    age: number;
    startScale: number;
    endY: number;
}

// Custom shader material interface for proper typing
interface CustomShaderMaterial extends THREE.ShaderMaterial {
    uniforms: {
        time: { value: number };
        color: { value: THREE.Color };
        glossiness: { value: number };
    };
}

// Interface for geometry parameters
interface PlaneGeometryParameters {
    width: number;
    height: number;
    widthSegments?: number;
    heightSegments?: number;
}

const FlowingInkEffect: React.FC<{
    width?: number;
    height?: number;
    backgroundColor?: string;
}> = ({
    width = window.innerWidth,
    height = window.innerHeight,
    backgroundColor = '#0c0c0c'
}) => {
        const mountRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (!mountRef.current) return;

            // Three.js setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(backgroundColor);

            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.z = 5;

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            mountRef.current.appendChild(renderer.domElement);

            // Enhanced ink shader material with fluid-like properties
            const inkShaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0.0 },
                    color: { value: new THREE.Color('#ffffff') },
                    glossiness: { value: 0.8 }
                },
                vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
                fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float glossiness;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float flow(vec2 uv) {
          float t = time * 0.4;
          // Use multiple noise layers with different frequencies
          float n1 = noise(vec2(uv.x * 10.0, uv.y * 10.0 + t));
          float n2 = noise(vec2(uv.x * 20.0 - t * 0.1, uv.y * 8.0 + t * 0.5)) * 0.5;
          
          // Create internal flow patterns
          float ripple = sin(uv.y * 40.0 - t * 3.0) * 0.1;
          float swirl = sin(uv.x * 5.0 + uv.y * 7.0 + t) * 0.05;
          
          return smoothstep(0.3, 0.7, n1 + n2 + ripple + swirl);
        }
        
        void main() {
          // Base color
          vec3 baseColor = color;
          
          // Add flowing effect
          float flowEffect = flow(vUv);
          
          // Glossiness/lighting effect
          vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          float specular = pow(max(dot(reflect(-lightDir, vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 20.0) * glossiness;
          
          // Drip distortion at bottom
          float drip = 0.0;
          if (vUv.y < 0.2) {
            drip = smoothstep(0.0, 0.2, vUv.y) * 0.2 * sin(vUv.x * 30.0 + time);
          }
          
          // Combine effects for final color
          vec3 finalColor = baseColor * (0.6 + diffuse * 0.4);
          finalColor += vec3(specular); 
          finalColor = mix(finalColor, finalColor * 0.7, flowEffect * 0.3);
          
          // Add subtle transparency variation at edges for fluid look
          float alpha = 1.0;
          float edgeFade = length(vUv - vec2(0.5, 0.5)) * 2.0;
          if (edgeFade > 0.8) {
            alpha = smoothstep(1.0, 0.8, edgeFade);
          }
          
          // Add transparency to the flow effect areas
          alpha *= (1.0 - flowEffect * 0.2);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
                side: THREE.DoubleSide,
                transparent: true
            }) as CustomShaderMaterial;

            // Create ink strokes
            const group = new THREE.Group();

            // Arrays to store drips, droplets and connecting threads
            const drips: Drip[] = [];
            const droplets: Droplet[] = [];
            const threads: Thread[] = [];

            // Create 5 vertical strokes
            const numStrokes = 5;
            const spacing = 0.8;

            for (let i = 0; i < numStrokes; i++) {
                const x = (i - (numStrokes - 1) / 2) * spacing;

                // Random variations for organic look
                const height = 2.0 + Math.random() * 0.4;
                const width = 0.25 + Math.random() * 0.1;
                const yOffset = Math.random() * 0.2 - 0.1;

                // Create the main stroke
                const strokeGeometry = new THREE.PlaneGeometry(width, height, 12, 24);

                // Add slight randomness to vertices for organic look
                const positionAttr = strokeGeometry.attributes.position;
                if (positionAttr) {
                    const positions = positionAttr.array as Float32Array;
                    for (let j = 0; j < positions.length; j += 3) {
                        positions[j] = (positions[j] ?? 0) + (Math.random() - 0.5) * 0.05; // x
                        positions[j + 1] = (positions[j + 1] ?? 0) + (Math.random() - 0.5) * 0.05; // y
                    }
                    positionAttr.needsUpdate = true;
                }

                // Custom material instance for each stroke
                const strokeMaterial = inkShaderMaterial.clone() as CustomShaderMaterial;
                strokeMaterial.uniforms.time = { value: Math.random() * 100 };

                const stroke = new THREE.Mesh(strokeGeometry, strokeMaterial);
                stroke.position.set(x, yOffset, 0);
                group.add(stroke);

                // Create potential drip points (2-3 per stroke)
                const dripPoints = Math.floor(Math.random() * 2) + 2;

                for (let d = 0; d < dripPoints; d++) {
                    // Random position along the bottom of the stroke
                    const offsetX = (Math.random() - 0.5) * (width * 0.8);

                    // Create animated drip
                    const dripWidth = width * (0.3 + Math.random() * 0.3);
                    const initialDripLength = 0.1 + Math.random() * 0.2; // Start with a small drip

                    const dripGeometry = new THREE.PlaneGeometry(dripWidth, initialDripLength, 6, 16);
                    const dripMaterial = strokeMaterial.clone() as CustomShaderMaterial;
                    const drip = new THREE.Mesh(dripGeometry, dripMaterial);

                    // Position at the bottom of the stroke
                    drip.position.set(
                        x + offsetX,
                        -height / 2,
                        0.01
                    );

                    // Store drip data for animation with enhanced fluid properties
                    drips.push({
                        mesh: drip,
                        width: dripWidth,
                        currentLength: initialDripLength,
                        growthRate: 0.002 + Math.random() * 0.004,
                        maxLength: 0.6 + Math.random() * 1.0,
                        active: true,
                        nextDropTime: 1 + Math.random() * 2,
                        timeSinceLastDrop: 0,
                        xPosition: x + offsetX,
                        yStart: -height / 2,
                        viscosity: 0.7 + Math.random() * 0.3, // Controls how the drip behaves
                        oscillationFrequency: 2 + Math.random() * 6, // For waviness
                        surfaceTensionStrength: 0.2 + Math.random() * 0.3 // For bulging
                    });

                    group.add(drip);
                }
            }

            // Create horizontal stroke crossing through
            const horizWidth = spacing * (numStrokes + 0.5);
            const horizHeight = 0.3;
            const horizGeometry = new THREE.PlaneGeometry(horizWidth, horizHeight, 24, 6);

            // Add random variations
            const horizPositionAttr = horizGeometry.attributes.position;
            if (horizPositionAttr) {
                const horizPositions = horizPositionAttr.array as Float32Array;
                for (let i = 0; i < horizPositions.length; i += 3) {
                    horizPositions[i + 1] = (horizPositions[i + 1] ?? 0) + (Math.random() - 0.5) * 0.05;
                }
                horizPositionAttr.needsUpdate = true;
            }

            const horizMaterial = inkShaderMaterial.clone() as CustomShaderMaterial;
            horizMaterial.uniforms.time = { value: Math.random() * 100 };

            const horizStroke = new THREE.Mesh(horizGeometry, horizMaterial);
            horizStroke.position.set(0, 0.2, 0.01);
            horizStroke.rotation.z = Math.PI * -0.05; // Slight tilt
            group.add(horizStroke);

            // Add some drip points for the horizontal stroke as well
            const horizDripCount = Math.floor(Math.random() * 3) + 1;
            for (let h = 0; h < horizDripCount; h++) {
                const offsetX = (Math.random() - 0.7) * horizWidth * 0.6;

                const dripWidth = 0.1 + Math.random() * 0.1;
                const initialDripLength = 0.05 + Math.random() * 0.1;

                const dripGeometry = new THREE.PlaneGeometry(dripWidth, initialDripLength, 4, 8);
                const dripMaterial = horizMaterial.clone() as CustomShaderMaterial;
                const drip = new THREE.Mesh(dripGeometry, dripMaterial);

                // Adjust for the rotation of the horizontal stroke
                drip.position.set(
                    offsetX,
                    0.2 - horizHeight / 2,
                    0.02
                );

                // Store drip data for animation with fluid properties
                drips.push({
                    mesh: drip,
                    width: dripWidth,
                    currentLength: initialDripLength,
                    growthRate: 0.001 + Math.random() * 0.003, // Slightly slower
                    maxLength: 0.4 + Math.random() * 0.6, // Slightly shorter
                    active: true,
                    nextDropTime: 1.5 + Math.random() * 3,
                    timeSinceLastDrop: 0,
                    xPosition: offsetX,
                    yStart: 0.2 - horizHeight / 2,
                    viscosity: 0.8 + Math.random() * 0.2, // Higher viscosity for horizontal drips
                    oscillationFrequency: 1 + Math.random() * 3, // Lower frequency for more stable drips
                    surfaceTensionStrength: 0.3 + Math.random() * 0.3 // Stronger surface tension
                });

                group.add(drip);
            }

            // Add group to scene
            scene.add(group);

            // Create a clock for animation timing
            const clock = new THREE.Clock();

            // Function to create a droplet with enhanced fluid properties
            function createDroplet(x: number, y: number, size: number) {
                const dropSize = size * (0.5 + Math.random() * 0.3);
                const dropGeometry = new THREE.CircleGeometry(dropSize, 12); // More segments for smoother circle
                const dropMaterial = inkShaderMaterial.clone() as CustomShaderMaterial;
                dropMaterial.uniforms.time = { value: Math.random() * 100 };

                const drop = new THREE.Mesh(dropGeometry, dropMaterial);
                drop.position.set(x, y, 0.02);

                // Add to droplets array with enhanced fluid properties
                const droplet: Droplet = {
                    mesh: drop,
                    speed: 0.01 + Math.random() * 0.02,
                    acceleration: 0.001 + Math.random() * 0.002,
                    oscillationAmount: 0.002 + Math.random() * 0.004,
                    oscillationSpeed: 5 + Math.random() * 10,
                    size: dropSize,
                    age: 0,
                    xVelocity: (Math.random() - 0.5) * 0.01 // Add horizontal velocity for more natural movement
                };

                droplets.push(droplet);
                group.add(drop);

                return droplet;
            }

            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);

                const delta = clock.getDelta();

                // Update time uniform for shaders
                group.children.forEach(child => {
                    if (child instanceof THREE.Mesh && child.material) {
                        const material = child.material as CustomShaderMaterial;
                        if (material.uniforms && material.uniforms.time) {
                            material.uniforms.time.value += 0.01;
                        }
                    }
                });

                // Animate drips with enhanced fluid-like behavior
                drips.forEach((drip) => {
                    if (drip.active) {
                        drip.timeSinceLastDrop += delta;

                        // Enhanced variable growth rate based on length, viscosity and physics
                        drip.growthRate = 0.002 + Math.random() * 0.004 +
                            (drip.currentLength * 0.005 * Math.pow(drip.viscosity, -0.7));

                        // Add acceleration to simulate gravity's effect on the drip
                        if (drip.currentLength > 0.3) {
                            drip.growthRate *= 1.04; // Accelerate longer drips more rapidly
                        }

                        // Grow the drip
                        drip.currentLength += drip.growthRate;

                        // Replace the geometry with a slightly longer one
                        drip.mesh.geometry.dispose();
                        drip.mesh.geometry = new THREE.PlaneGeometry(drip.width, drip.currentLength, 6, 16);

                        // Update position to keep drip attached to the stroke
                        drip.mesh.position.y = drip.yStart - drip.currentLength / 2;

                        // Reshape vertices for fluid-like tapered look with enhanced bulging
                        const positionAttr = drip.mesh.geometry.attributes.position;
                        if (positionAttr) {
                            const positions = positionAttr.array as Float32Array;

                            for (let j = 0; j < positions.length; j += 3) {
                                const y = positions[j + 1] ?? 0;
                                const normalizedY = (y + drip.currentLength / 2) / drip.currentLength;

                                // Variable width factor based on position with improved physics
                                let widthFactor;

                                // Add variable surface tension based on drip length
                                const surfaceTensionFactor = Math.max(0.3, 1 - drip.currentLength / drip.maxLength);
                                const effectiveSurfaceTension = drip.surfaceTensionStrength * surfaceTensionFactor;

                                if (normalizedY < 0.15) {
                                    // Enhanced bulging at tip - simulates surface tension with more realistic physics
                                    widthFactor = 0.7 + Math.sin(normalizedY * Math.PI) * effectiveSurfaceTension;

                                    // Add additional bulging at the very tip for pending droplets
                                    if (normalizedY < 0.05 && drip.timeSinceLastDrop > drip.nextDropTime * 0.7) {
                                        widthFactor += (0.3 * (drip.timeSinceLastDrop / drip.nextDropTime));
                                    }
                                } else {
                                    // Natural tapering along the length with improved fluid profile
                                    widthFactor = Math.pow(normalizedY, 0.6) * (1 - (1 - normalizedY) * 0.2);
                                }


                                // Apply width factor to create tapering
                                positions[j] = (positions[j] ?? 0) * widthFactor;

                                // Add enhanced waviness/oscillation for fluid-like behavior
                                // More pronounced at the bottom, less at the top
                                const oscillationAmplitude = 0.01 * Math.pow(normalizedY, 1.5);
                                positions[j] = (positions[j] ?? 0) + Math.sin(normalizedY * drip.oscillationFrequency +
                                    drip.timeSinceLastDrop * 10) * oscillationAmplitude;
                            }
                            positionAttr.needsUpdate = true;
                        }

                        // Create droplet with enhanced conditions
                        if (drip.timeSinceLastDrop > drip.nextDropTime &&
                            drip.currentLength > drip.maxLength * 0.7) {

                            // Add slight randomness to position for natural look
                            const dropletX = drip.xPosition + (Math.random() - 0.5) * 0.05;
                            const dropletY = drip.yStart - drip.currentLength;

                            // Create the main droplet with size based on viscosity
                            const dropletSize = drip.width * (0.5 + (1 - drip.viscosity) * 0.5);
                            const droplet = createDroplet(dropletX, dropletY, dropletSize);

                            // Create a thin connecting thread that will disappear
                            const threadHeight = 0.1 + Math.random() * 0.15;
                            const threadGeometry = new THREE.PlaneGeometry(drip.width * 0.2, threadHeight, 2, 8);
                            const dripMaterial = Array.isArray(drip.mesh.material)
                                ? drip.mesh.material[0]
                                : drip.mesh.material;
                            const threadMaterial = (dripMaterial ?? inkShaderMaterial).clone() as CustomShaderMaterial;
                            const thread = new THREE.Mesh(threadGeometry, threadMaterial);

                            thread.position.set(
                                drip.xPosition,
                                drip.yStart - drip.currentLength + threadHeight / 2,
                                0.02
                            );

                            // Store with a lifespan
                            threads.push({
                                mesh: thread,
                                lifespan: 0.5 + Math.random() * 0.3,
                                age: 0,
                                startScale: 1,
                                endY: droplet.mesh.position.y + droplet.size / 2
                            });

                            group.add(thread);

                            drip.timeSinceLastDrop = 0;
                            drip.nextDropTime = 1 + Math.random() * 3;

                            // Reset drip length more dynamically based on viscosity
                            drip.currentLength *= 0.5 + drip.viscosity * 0.3;
                        }
                    }
                });

                // Animate connecting threads with improved physics
                for (let i = threads.length - 1; i >= 0; i--) {
                    const thread = threads[i];
                    if (!thread) continue;
                    thread.age += delta;

                    // Thin out and stretch the thread as it ages with improved physics
                    const ageRatio = thread.age / thread.lifespan;
                    thread.mesh.scale.x = 1 - (ageRatio * 0.8);

                    const geometry = thread.mesh.geometry as THREE.PlaneGeometry;
                    const newHeight = geometry.parameters.height *
                        (1 + ageRatio * (1 + Math.sin(ageRatio * Math.PI * 2) * 0.2));

                    thread.mesh.geometry.dispose();
                    thread.mesh.geometry = new THREE.PlaneGeometry(
                        geometry.parameters.width,
                        newHeight,
                        2, 8
                    );


                    // Apply more realistic thinning in the middle
                    const positionAttr = thread.mesh.geometry.attributes.position;
                    if (positionAttr) {
                        const positions = positionAttr.array as Float32Array;
                        for (let j = 0; j < positions.length; j += 3) {
                            const y = positions[j + 1] ?? 0;
                            const normalizedY = (y + newHeight / 2) / newHeight;

                            // Create thinner middle section
                            const widthFactor = 0.5 + Math.sin(normalizedY * Math.PI) * 0.5;
                            positions[j] = (positions[j] ?? 0) * widthFactor * (1 - ageRatio * 0.5);
                        }
                        positionAttr.needsUpdate = true;
                    }

                    // Remove if expired
                    if (thread && thread.age >= thread.lifespan) {
                        group.remove(thread.mesh);
                        thread.mesh.geometry.dispose();
                        if (thread.mesh.material) {
                            (thread.mesh.material as THREE.Material).dispose();
                        }
                        threads.splice(i, 1);
                    }
                }

                // Animate falling droplets with enhanced fluid-like deformation
                for (let i = droplets.length - 1; i >= 0; i--) {
                    const droplet = droplets[i];
                    if (!droplet) continue;
                    droplet.age += delta;

                    // Accelerate the droplet (gravity effect)
                    droplet.speed += droplet.acceleration;

                    // Move downward with realistic physics
                    droplet.mesh.position.y -= droplet.speed;

                    // Apply horizontal velocity if present (for more natural movement)
                    if (droplet.xVelocity) {
                        droplet.mesh.position.x += droplet.xVelocity;

                        // Gradually reduce horizontal velocity due to air resistance
                        droplet.xVelocity *= 0.98;
                    }

                    // Enhanced deformation based on velocity (stretch when moving fast, compress when slowing)
                    const stretchFactor = 1 + (droplet.speed * 7);
                    droplet.mesh.scale.y = Math.min(stretchFactor, 2.2);
                    droplet.mesh.scale.x = 1 / Math.sqrt(stretchFactor);

                    // Add oscillation for more fluid-like movement with damping
                    const oscillationDamping = Math.max(0.2, 1 - droplet.age * 0.5);
                    droplet.mesh.position.x += Math.sin(droplet.age * droplet.oscillationSpeed) *
                        droplet.oscillationAmount * oscillationDamping;

                    // Check for droplet collisions and merging
                    for (let j = i + 1; j < droplets.length; j++) {
                        const d1 = droplets[i];
                        const d2 = droplets[j];

                        if (d1 === undefined || d2 === undefined) {
                            continue;
                        }

                        // Calculate distance between droplets
                        const dx = d1.mesh.position.x - d2.mesh.position.x;
                        const dy = d1.mesh.position.y - d2.mesh.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // If close enough, merge them
                        if (distance < (d1.size + d2.size) * 0.6) {
                            // Create new larger droplet
                            const newSize = Math.sqrt(d1.size * d1.size + d2.size * d2.size);
                            const newX = (d1.mesh.position.x + d2.mesh.position.x) / 2;
                            const newY = (d1.mesh.position.y + d2.mesh.position.y) / 2;

                            // New droplet inherits average properties with combined momentum
                            const newDroplet = createDroplet(newX, newY, newSize);
                            newDroplet.speed = (d1.speed + d2.speed) / 2;
                            newDroplet.xVelocity = ((d1.xVelocity || 0) + (d2.xVelocity || 0)) / 2;

                            // Remove the original droplets
                            group.remove(d1.mesh);
                            group.remove(d2.mesh);
                            d1.mesh.geometry.dispose();
                            if (d1.mesh.material) {
                                (d1.mesh.material as THREE.Material).dispose();
                            }
                            d2.mesh.geometry.dispose();
                            if (d2.mesh.material) {
                                (d2.mesh.material as THREE.Material).dispose();
                            }
                            droplets.splice(j, 1);
                            droplets.splice(i, 1);
                            i--; // Adjust index after removal
                            break;
                        }
                    }

                    // Remove if it's gone too far
                    if (i >= 0 && droplet.mesh.position.y < -3) {
                        group.remove(droplet.mesh);
                        droplet.mesh.geometry.dispose();
                        if (droplet.mesh.material) {
                            (droplet.mesh.material as THREE.Material).dispose();
                        }
                        droplets.splice(i, 1);
                    }
                }

                renderer.render(scene, camera);
            };

            animate();

            // Handle window resize with ResizeObserver for better performance
            const resizeObserver = new ResizeObserver((entries) => {
                if (!mountRef.current) return;

                const entry = entries[0];
                if (!entry) return;
                const newWidth = entry.contentRect.width;
                const newHeight = entry.contentRect.height;

                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(newWidth, newHeight);
            });

            if (mountRef.current) {
                resizeObserver.observe(mountRef.current);
            }

            // Cleanup
            return () => {
                resizeObserver.disconnect();

                if (mountRef.current) {
                    mountRef.current.removeChild(renderer.domElement);
                }

                // Dispose resources
                group.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (object.material) {
                            (object.material as THREE.Material).dispose();
                        }
                    }
                });

                renderer.dispose();
            };
        }, [width, height, backgroundColor]);

        return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
    };

export default FlowingInkEffect;
