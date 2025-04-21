import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const FlowingInkEffect: React.FC<{
    width?: number;
    height?: number;
    backgroundColor?: string;
    inkColor?: string; // Added prop for ink color
}> = ({
    width: propWidth, // Rename to avoid conflict with window.innerWidth
    height: propHeight, // Rename to avoid conflict with window.innerHeight
    backgroundColor = '#f5f5f5',
    inkColor = '#000000' // Default ink color
}) => {
        const mountRef = useRef<HTMLDivElement>(null);
        // Use refs to store mutable values like animation state without causing re-renders [[2]] [[4]] [[12]]
        const animationFrameId = useRef<number>();
        const clock = useRef(new THREE.Clock()); // Use a clock for time-based animation

        useEffect(() => {
            // Use effect to synchronize with the DOM and external systems (Three.js) [[1]] [[6]] [[15]]
            if (!mountRef.current) return;

            const currentMount = mountRef.current; // Capture mountRef.current

            // Determine dimensions based on props or window size
            const effectiveWidth = propWidth ?? currentMount.clientWidth;
            const effectiveHeight = propHeight ?? currentMount.clientHeight;

            // --- Three.js Setup ---
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(backgroundColor);

            const camera = new THREE.PerspectiveCamera(75, effectiveWidth / effectiveHeight, 0.1, 1000);
            camera.position.z = 5;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Enable alpha for potential transparency
            renderer.setSize(effectiveWidth, effectiveHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            currentMount.appendChild(renderer.domElement);

            // --- Ink Shader Material ---
            // This material provides the basic flowing texture within the ink shapes
            const inkShaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0.0 },
                    color: { value: new THREE.Color(inkColor) },
                    glossiness: { value: 0.6 }, // Slightly reduced glossiness
                    noiseScale: { value: 10.0 },
                    rippleScale: { value: 40.0 },
                    rippleSpeed: { value: 3.0 },
                    flowSpeed: { value: 0.4 },
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vNormal;

                    void main() {
                      vUv = uv;
                      // Ensure normals are calculated correctly even if geometry is scaled
                      vNormal = normalize(normalMatrix * normal);
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                  `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    uniform float glossiness;
                    uniform float noiseScale;
                    uniform float rippleScale;
                    uniform float rippleSpeed;
                    uniform float flowSpeed;

                    varying vec2 vUv;
                    varying vec3 vNormal;

                    // Simple noise function
                    float noise(vec2 st) {
                      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                    }

                    // Flow calculation based on noise and ripple
                    float flow(vec2 uv, float t) {
                      float n = noise(vec2(uv.x * noiseScale, uv.y * noiseScale + t));
                      float ripple = sin(uv.y * rippleScale - t * rippleSpeed) * 0.1;
                      // Smoothstep creates the ink-like boundary
                      return smoothstep(0.3, 0.7, n + ripple);
                    }

                    void main() {
                      // Base color from uniform
                      vec3 baseColor = color;

                      // Calculate the flowing effect using time
                      float flowEffect = flow(vUv, time * flowSpeed);

                      // Basic lighting for glossiness
                      vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
                      float diffuse = max(dot(vNormal, lightDir), 0.0);
                      // Calculate specular reflection (shininess)
                      vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0)); // Assuming camera looks along -Z
                      vec3 reflectDir = reflect(-lightDir, vNormal);
                      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0); // Phong specular
                      float specular = spec * glossiness;

                      // Combine effects for final color
                      // Start with base color, add diffuse lighting
                      vec3 finalColor = baseColor * (0.6 + diffuse * 0.4);
                      // Add specular highlight
                      finalColor += vec3(specular);
                      // Mix based on the flow effect to add texture variation
                      finalColor = mix(finalColor, finalColor * 0.7, flowEffect * 0.3);

                      // Output final color and alpha (fully opaque for the shader itself)
                      gl_FragColor = vec4(finalColor, 1.0);
                    }
                  `,
                side: THREE.DoubleSide,
                transparent: true, // Needed if we were fading with alpha in shader
            });

            // --- Ink Geometry Creation ---
            const group = new THREE.Group();
            const animatedObjects: THREE.Mesh[] = []; // Store objects needing animation updates

            const numStrokes = 5;
            const spacing = 0.8;

            for (let i = 0; i < numStrokes; i++) {
                const x = (i - (numStrokes - 1) / 2) * spacing;

                // Random variations for organic look
                const strokeHeight = 2.0 + Math.random() * 0.4;
                const strokeWidth = 0.25 + Math.random() * 0.1;
                const yOffset = Math.random() * 0.2 - 0.1;

                // --- Main Stroke ---
                const strokeGeometry = new THREE.PlaneGeometry(strokeWidth, strokeHeight, 12, 24);
                // Add vertex randomness (optional, can be subtle)
                const positions = strokeGeometry.attributes.position.array;
                for (let j = 0; j < positions.length; j += 3) {
                    positions[j] += (Math.random() - 0.5) * 0.03; // x
                    positions[j + 1] += (Math.random() - 0.5) * 0.03; // y
                }
                strokeGeometry.attributes.position.needsUpdate = true;

                // Use a cloned material instance for each object if uniforms need to be unique per object
                // Here, only 'time' might differ if we wanted staggered flow, but we update globally
                const strokeMaterial = inkShaderMaterial.clone();
                // Assign a unique start time offset for the shader's internal flow pattern
                strokeMaterial.uniforms.time = { value: Math.random() * 100 };

                const stroke = new THREE.Mesh(strokeGeometry, strokeMaterial);
                stroke.position.set(x, yOffset, 0);
                group.add(stroke);
                animatedObjects.push(stroke); // Add stroke to update its shader time

                // --- Dripping Effect (Animated Mesh) ---
                const dripMaxHeight = 0.8 + Math.random() * 1.2;
                const dripWidth = strokeWidth * (0.3 + Math.random() * 0.3);
                // Create geometry with full height, we'll scale it down initially
                const dripGeometry = new THREE.PlaneGeometry(dripWidth, dripMaxHeight, 6, 16);

                // Make the drip narrow at the bottom (modify vertices)
                const dripPositions = dripGeometry.attributes.position.array;
                for (let j = 0; j < dripPositions.length; j += 3) {
                    const y = dripPositions[j + 1]; // Vertex y-position relative to center
                    // Normalize y from -h/2 to +h/2 -> 0 to 1 (0 at bottom, 1 at top)
                    const normalizedY = (y + dripMaxHeight / 2) / dripMaxHeight;
                    const narrowingFactor = Math.pow(normalizedY, 0.7); // Stronger narrowing near bottom
                    dripPositions[j] *= narrowingFactor; // Scale x based on y

                    // Add minor random variations
                    dripPositions[j] += (Math.random() - 0.5) * 0.02 * normalizedY;
                    dripPositions[j + 1] += (Math.random() - 0.5) * 0.02 * normalizedY;
                }
                dripGeometry.attributes.position.needsUpdate = true;
                dripGeometry.computeVertexNormals(); // Recompute normals after vertex manipulation

                const dripMaterial = strokeMaterial.clone(); // Clone material for the drip
                const drip = new THREE.Mesh(dripGeometry, dripMaterial);

                // Position the drip's *center* below the stroke's bottom edge
                const strokeBottomY = yOffset - strokeHeight / 2;
                drip.position.set(x, strokeBottomY - dripMaxHeight / 2, 0.01); // Z slightly forward

                // Set initial scale to almost zero height
                drip.scale.y = 0.01;
                // Anchor scaling to the top: move origin to top edge
                dripGeometry.translate(0, dripMaxHeight / 2, 0);
                // Adjust position accordingly
                drip.position.y = strokeBottomY; // Top of drip geometry is now at stroke bottom

                // Store animation data in userData
                drip.userData = {
                    isDrip: true,
                    startTime: clock.current.getElapsedTime() + Math.random() * 3.0, // Stagger start times
                    dripSpeed: 0.15 + Math.random() * 0.1, // Speed factor for scaling
                    maxHeight: dripMaxHeight,
                    resetDelay: 2.0 + Math.random() * 2.0 // Time after full drip before reset
                };
                group.add(drip);
                animatedObjects.push(drip); // Add drip for animation updates

                // --- Dripping Droplets (Animated Meshes) ---
                const numDroplets = Math.floor(Math.random() * 3) + 1;
                const dripBottomY = strokeBottomY - dripMaxHeight; // Approximate bottom of the fully formed drip

                for (let d = 0; d < numDroplets; d++) {
                    const dropSize = 0.05 + Math.random() * 0.05;
                    const dropGeometry = new THREE.CircleGeometry(dropSize, 12); // Use CircleGeometry for drops
                    const dropMaterial = strokeMaterial.clone();

                    const drop = new THREE.Mesh(dropGeometry, dropMaterial);
                    // Initial position near where the drip will end
                    const initialDropY = dripBottomY - d * 0.1 - Math.random() * 0.1;
                    drop.position.set(
                        x + (Math.random() - 0.5) * dripWidth * 0.5, // Start within drip width
                        initialDropY,
                        0.02 // Slightly in front of drip
                    );

                    // Initially invisible/off-screen until its time comes
                    drop.visible = false;

                    drop.userData = {
                        isDroplet: true,
                        startTime: clock.current.getElapsedTime() + (dripMaxHeight / (drip.userData.dripSpeed * 1.5)) + Math.random() * 1.0 + d * 0.5, // Start after drip forms
                        fallSpeed: 0.8 + Math.random() * 0.4, // How fast it falls
                        initialY: initialDropY,
                        initialX: drop.position.x,
                        resetY: -camera.position.z * 1.5 // Position far below camera to reset
                    };
                    group.add(drop);
                    animatedObjects.push(drop); // Add droplet for animation updates
                }
            }

            // --- Horizontal Stroke ---
            const horizWidth = spacing * (numStrokes + 0.5);
            const horizHeight = 0.3;
            const horizGeometry = new THREE.PlaneGeometry(horizWidth, horizHeight, 24, 6);
            // Add vertex randomness
            const horizPositions = horizGeometry.attributes.position.array;
            for (let i = 0; i < horizPositions.length; i += 3) {
                horizPositions[i + 1] += (Math.random() - 0.5) * 0.05; // y variation
            }
            horizGeometry.attributes.position.needsUpdate = true;
            horizGeometry.computeVertexNormals();

            const horizMaterial = inkShaderMaterial.clone();
            horizMaterial.uniforms.time = { value: Math.random() * 100 };

            const horizStroke = new THREE.Mesh(horizGeometry, horizMaterial);
            horizStroke.position.set(0, 0.2, 0.015); // Slightly in front
            horizStroke.rotation.z = Math.PI * -0.02; // Reduced tilt
            group.add(horizStroke);
            animatedObjects.push(horizStroke); // Add horizontal stroke for shader time update

            scene.add(group);

            // --- Animation Loop ---
            const animate = () => {
                animationFrameId.current = requestAnimationFrame(animate);

                const elapsedTime = clock.current.getElapsedTime();
                const deltaTime = clock.current.getDelta(); // Time since last frame

                // Update animated objects
                animatedObjects.forEach(child => {
                    // Update shader time for the flowing texture effect
                    if (child.material instanceof THREE.ShaderMaterial) {
                        child.material.uniforms.time.value += deltaTime; // Use deltaTime for smoother animation
                    }

                    const userData = child.userData;

                    // Animate Drips (Scaling)
                    if (userData?.isDrip) {
                        const timeSinceStart = elapsedTime - userData.startTime;

                        if (timeSinceStart >= 0) {
                            // Calculate target scale based on time and speed
                            let targetScaleY = Math.min(timeSinceStart * userData.dripSpeed, 1.0);
                            child.scale.y = targetScaleY;

                            // Check for reset condition
                            if (targetScaleY >= 1.0 && timeSinceStart > (userData.maxHeight / userData.dripSpeed) + userData.resetDelay) {
                                // Reset the drip
                                userData.startTime = elapsedTime + Math.random() * 3.0; // Schedule next start
                                child.scale.y = 0.01; // Reset scale
                            }
                        } else {
                            // Haven't started yet
                            child.scale.y = 0.01;
                        }
                    }

                    // Animate Droplets (Falling)
                    if (userData?.isDroplet) {
                        const timeSinceStart = elapsedTime - userData.startTime;

                        if (timeSinceStart >= 0) {
                            // Make visible when starting
                            child.visible = true;
                            // Calculate fall distance
                            const fallDistance = timeSinceStart * userData.fallSpeed;
                            child.position.y = userData.initialY - fallDistance;

                            // Check for reset condition (fallen off screen)
                            if (child.position.y < userData.resetY) {
                                userData.startTime = elapsedTime + Math.random() * 5.0 + 3.0; // Schedule next start (longer delay)
                                child.position.y = userData.initialY; // Reset position
                                child.position.x = userData.initialX + (Math.random() - 0.5) * 0.1; // Slight x variation on reset
                                child.visible = false; // Hide until next start
                            }
                        } else {
                            // Haven't started yet
                            child.visible = false;
                        }
                    }
                });

                renderer.render(scene, camera);
            };

            animate();

            // --- Handle Window Resize --- [[5]] [[8]] [[10]] [[14]] [[19]]
            const handleResize = () => {
                if (!mountRef.current) return; // Check ref still exists

                const newWidth = propWidth ?? currentMount.clientWidth;
                const newHeight = propHeight ?? currentMount.clientHeight;

                // Update camera aspect ratio
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();

                // Update renderer size
                renderer.setSize(newWidth, newHeight);
                // Adjust pixel ratio in case window moved screens
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            };

            // Use resize observer for element resize if width/height props aren't fixed
            let resizeObserver: ResizeObserver | null = null;
            if (!propWidth || !propHeight) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(currentMount);
            } else {
                // If using fixed props, still listen to window resize for pixel ratio changes etc.
                window.addEventListener('resize', handleResize);
            }


            // --- Cleanup ---
            return () => {
                cancelAnimationFrame(animationFrameId.current!);
                window.removeEventListener('resize', handleResize);
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }

                // Dispose Three.js resources
                group.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        // Check if material is an array or single
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else if (object.material) {
                            object.material.dispose();
                        }
                    }
                });
                scene.clear(); // Remove all objects

                renderer.dispose(); // Dispose renderer context

                if (currentMount && renderer.domElement) {
                    // Check if renderer.domElement is still a child before removing
                    if (currentMount.contains(renderer.domElement)) {
                        currentMount.removeChild(renderer.domElement);
                    }
                }
                console.log("Three.js scene cleaned up");
            };
            // Add all dependencies that trigger the effect setup [[1]]
        }, [propWidth, propHeight, backgroundColor, inkColor]);

        // Use a div that takes up 100% of parent unless specific size is given
        const style: React.CSSProperties = {
            width: propWidth ? `${propWidth}px` : '100%',
            height: propHeight ? `${propHeight}px` : '100%',
            overflow: 'hidden', // Hide potential scrollbars if canvas slightly overflows
        };

        return <div ref={mountRef} style={style} />;
    };

export default FlowingInkEffect;
