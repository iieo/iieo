import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

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
            });

            // Create ink strokes
            const group = new THREE.Group();

            // Arrays to store drips, droplets and connecting threads
            const drips = [];
            const droplets = [];
            const threads = [];

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
                const positions = strokeGeometry.attributes.position.array;
                for (let j = 0; j < positions.length; j += 3) {
                    positions[j] += (Math.random() - 0.5) * 0.05; // x
                    positions[j + 1] += (Math.random() - 0.5) * 0.05; // y
                }

                // Custom material instance for each stroke
                const strokeMaterial = inkShaderMaterial.clone();
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
                    const dripMaterial = strokeMaterial.clone();
                    const drip = new THREE.Mesh(dripGeometry, dripMaterial);

                    // Position at the bottom of the stroke
                    drip.position.set(
                        x + offsetX,
                        -height / 2,
                        0.01
                    );

                    // Store drip data for animation with fluid properties
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
            const horizPositions = horizGeometry.attributes.position.array;
            for (let i = 0; i < horizPositions.length; i += 3) {
                horizPositions[i + 1] += (Math.random() - 0.5) * 0.05;
            }

            const horizMaterial = inkShaderMaterial.clone();
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
                const dripMaterial = horizMaterial.clone();
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
            function createDroplet(x, y, size) {
                const dropSize = size * (0.5 + Math.random() * 0.3);
                const dropGeometry = new THREE.CircleGeometry(dropSize, 12); // More segments for smoother circle
                const dropMaterial = inkShaderMaterial.clone();
                dropMaterial.uniforms.time = { value: Math.random() * 100 };

                const drop = new THREE.Mesh(dropGeometry, dropMaterial);
                drop.position.set(x, y, 0.02);

                // Add to droplets array with fluid properties
                const droplet = {
                    mesh: drop,
                    speed: 0.01 + Math.random() * 0.02,
                    acceleration: 0.001 + Math.random() * 0.002,
                    oscillationAmount: 0.002 + Math.random() * 0.004,
                    oscillationSpeed: 5 + Math.random() * 10,
                    size: dropSize,
                    age: 0
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
                    if (child.material && child.material.uniforms && child.material.uniforms.time) {
                        child.material.uniforms.time.value += 0.01;
                    }
                });

                // Animate drips with fluid-like behavior
                drips.forEach((drip, index) => {
                    if (drip.active) {
                        drip.timeSinceLastDrop += delta;

                        // Variable growth rate based on length (accelerates as it gets longer)
                        drip.growthRate = 0.002 + Math.random() * 0.004 + (drip.currentLength * 0.005);

                        // Add acceleration to simulate gravity's effect on the drip
                        if (drip.currentLength > 0.3) {
                            drip.growthRate *= 1.02; // Accelerate longer drips
                        }

                        // Grow the drip
                        drip.currentLength += drip.growthRate;

                        // Replace the geometry with a slightly longer one
                        drip.mesh.geometry.dispose();
                        drip.mesh.geometry = new THREE.PlaneGeometry(drip.width, drip.currentLength, 6, 16);

                        // Update position to keep drip attached to the stroke
                        drip.mesh.position.y = drip.yStart - drip.currentLength / 2;

                        // Reshape vertices for fluid-like tapered look with bulging
                        const positions = drip.mesh.geometry.attributes.position.array;
                        for (let j = 0; j < positions.length; j += 3) {
                            const y = positions[j + 1];
                            const normalizedY = (y + drip.currentLength / 2) / drip.currentLength;

                            // Variable width factor based on position
                            let widthFactor;

                            if (normalizedY < 0.15) {
                                // Create bulging at tip - simulates surface tension
                                widthFactor = 0.7 + Math.sin(normalizedY * Math.PI) * drip.surfaceTensionStrength;
                            } else {
                                // Natural tapering along the length
                                widthFactor = Math.pow(normalizedY, 0.6);
                            }

                            // Apply width factor to create tapering
                            positions[j] *= widthFactor;

                            // Add waviness/oscillation for fluid-like behavior
                            positions[j] += Math.sin(normalizedY * drip.oscillationFrequency + drip.timeSinceLastDrop * 10) * 0.01 * normalizedY;
                        }
                        drip.mesh.geometry.attributes.position.needsUpdate = true;

                        // Create droplet if it's time
                        if (drip.timeSinceLastDrop > drip.nextDropTime) {
                            // Create the main droplet
                            const droplet = createDroplet(
                                drip.xPosition + (Math.random() - 0.5) * 0.05,
                                drip.yStart - drip.currentLength,
                                drip.width * 0.7  // Slightly larger droplets
                            );

                            // Create a thin connecting thread that will disappear
                            const threadHeight = 0.1 + Math.random() * 0.15;
                            const threadGeometry = new THREE.PlaneGeometry(drip.width * 0.2, threadHeight, 2, 8);
                            const threadMaterial = drip.mesh.material.clone();
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

                            // Reduce length after droplet forms
                            drip.currentLength *= 0.6;
                        }
                    }
                });

                // Animate connecting threads
                for (let i = threads.length - 1; i >= 0; i--) {
                    const thread = threads[i];
                    thread.age += delta;

                    // Thin out and stretch the thread as it ages
                    const ageRatio = thread.age / thread.lifespan;
                    thread.mesh.scale.x = 1 - (ageRatio * 0.8);

                    // Stretch thread as it follows the droplet
                    const newHeight = thread.mesh.geometry.parameters.height * (1 + ageRatio);
                    thread.mesh.geometry.dispose();
                    thread.mesh.geometry = new THREE.PlaneGeometry(
                        thread.mesh.geometry.parameters.width,
                        newHeight,
                        2, 8
                    );

                    // Remove if expired
                    if (thread.age >= thread.lifespan) {
                        group.remove(thread.mesh);
                        thread.mesh.geometry.dispose();
                        thread.mesh.material.dispose();
                        threads.splice(i, 1);
                    }
                }

                // Animate falling droplets with fluid-like deformation
                for (let i = droplets.length - 1; i >= 0; i--) {
                    const droplet = droplets[i];
                    droplet.age += delta;

                    // Accelerate the droplet (gravity effect)
                    droplet.speed += droplet.acceleration;

                    // Move downward
                    droplet.mesh.position.y -= droplet.speed;

                    // Deform the droplet based on velocity (stretch when moving fast)
                    const stretchFactor = 1 + (droplet.speed * 5);
                    droplet.mesh.scale.y = Math.min(stretchFactor, 1.8);
                    droplet.mesh.scale.x = 1 / Math.sqrt(stretchFactor);

                    // Add oscillation for more fluid-like movement
                    droplet.mesh.position.x += Math.sin(droplet.mesh.position.y * 5) * droplet.oscillationAmount;

                    // Remove if it's gone too far
                    if (droplet.mesh.position.y < -3) {
                        group.remove(droplet.mesh);
                        droplet.mesh.geometry.dispose();
                        droplet.mesh.material.dispose();
                        droplets.splice(i, 1);
                    }
                }

                renderer.render(scene, camera);
            };

            animate();

            // Handle window resize
            const handleResize = () => {
                if (!mountRef.current) return;

                const newWidth = mountRef.current.clientWidth;
                const newHeight = mountRef.current.clientHeight;

                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(newWidth, newHeight);
            };

            window.addEventListener('resize', handleResize);

            // Cleanup
            return () => {
                window.removeEventListener('resize', handleResize);
                if (mountRef.current) {
                    mountRef.current.removeChild(renderer.domElement);
                }

                // Dispose resources
                group.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (object.material) {
                            object.material.dispose();
                        }
                    }
                });

                renderer.dispose();
            };
        }, [width, height, backgroundColor]);

        return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
    };

export default FlowingInkEffect;
