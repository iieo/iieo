import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;
  
  #define PI 3.14159265359
  #define TWO_PI 6.28318530718
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Smoothstep that ensures smooth transition over the full 0-TWO_PI range
  float smoothAngle(float angle, float phase) {
    // Normalize angle to 0-1 range
    float normAngle = angle / TWO_PI;
    float normPhase = phase / TWO_PI;
    
    // Calculate distance in the circular domain
    float distCW = mod(normAngle - normPhase, 1.0);
    float distCCW = mod(normPhase - normAngle, 1.0);
    
    // Use the shorter distance
    float dist = min(distCW, distCCW);
    
    // Apply smoothstep
    return smoothstep(0.0, 0.1, dist) * smoothstep(0.2, 0.1, dist);
  }
  
  void main() {
    // Calculate aspect ratio to prevent stretching
    float aspect = resolution.x / resolution.y;
    
    // Center the coordinates
    vec2 uv = vUv - 0.5;
    
    // Apply aspect ratio correction properly
    uv.x *= aspect;
    
    // Calculate distance from center
    float dist = length(uv);

    // Calculate angle and shift the discontinuity to the left instead
    float angle = atan(uv.y, uv.x);
    angle = angle < 0.0 ? angle + TWO_PI : angle;
    angle = mod(angle + PI, TWO_PI); // Shift by PI to move discontinuity to the left

    
    // Create the vortex effect
    float vortexFactor = 15.0;  // Controls the swirl intensity
    float timeFactor = time * 0.2;  // Control animation speed
    
    // Create concentric rings with noise distortion
    float ringCount = 50.0;
    float thickness = 0.03;
    
    // Add noise to the rings
    float noiseScale = 4.0;
    float noiseTime = time * 0.1;
    
    // Use multiple noise samples with different scales for organic effect
    float noise1 = snoise(vec2(angle * 2.0, dist * 10.0 + noiseTime)) * 0.1;
    float noise2 = snoise(vec2(angle * 5.0, dist * 8.0 - noiseTime * 1.5)) * 0.05;
    float noise3 = snoise(vec2(dist * 15.0 + time * 0.05, angle * 3.0)) * 0.03;
    
    // Create the vortex displacement without discontinuity
    float vortex = angle + dist * vortexFactor + timeFactor;
    
    // Apply distortion
    float distortedDist = dist + noise1 + noise2 * 0.5 + noise3;
    
    // Create rings with smooth transition
    float rings = sin(distortedDist * ringCount * 2.0 - vortex * 2.0) * 0.5 + 0.5;
    rings = smoothstep(0.5 - thickness, 0.5 + thickness, rings);
    
    // Create radial gradient for the tunnel effect
    float tunnel = smoothstep(1.0, 0.0, distortedDist * 1.5);
    
    // Mix colors based on angle for the pink-purple gradient
    vec3 pink = vec3(0.92, 0.38, 0.84);
    vec3 purple = vec3(0.47, 0.18, 0.64);
    vec3 darkPurple = vec3(0.1, 0.05, 0.15);
    
    // Calculate color gradient based on angle and distance,
    // using a continuous function to avoid seams
    float colorMix = (sin(angle * 3.0 + time * 0.2) * 0.5 + 0.5) * (1.0 - dist);
    vec3 color = mix(pink, purple, colorMix);
    
    // Apply rings and tunnel
    color = mix(color, darkPurple, rings);
    color = mix(vec3(0.0), color, tunnel);
    
    // Darken the center
    float centerDarkness = smoothstep(0.0, 0.3, dist);
    color *= centerDarkness;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface VortexShaderProps {
    className?: string;
    style?: React.CSSProperties;
}

const VortexShader: React.FC<VortexShaderProps> = ({ className, style }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const timeRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Setup scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Setup camera (orthographic to keep aspect ratio consistent)
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        cameraRef.current = camera;

        // Setup renderer with correct size
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        // Get the actual dimensions of the container
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create shader material with proper resolution
        const uniforms = {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(width, height) }
        };

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms
        });
        materialRef.current = material;

        // Create plane geometry to cover the entire view
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Handle resizing
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !materialRef.current) return;

            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            rendererRef.current.setSize(width, height);
            if (materialRef.current.uniforms.resolution && materialRef.current.uniforms.resolution.value) {
                materialRef.current.uniforms.resolution.value.set(width, height);
            }
        };

        window.addEventListener('resize', handleResize);

        // Animation loop
        const animate = (time: number) => {
            timeRef.current = time * 0.001; // Convert to seconds

            if (materialRef.current && materialRef.current.uniforms.time) {
                materialRef.current.uniforms.time.value = timeRef.current;
            }

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                renderer.dispose();
            }
            if (geometry) geometry.dispose();
            if (material) material.dispose();
        };
    }, []);

    // Default style ensures full width and height
    const defaultStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden'
    };

    const combinedStyle = { ...defaultStyle, ...style };

    return <div ref={containerRef} className={className} style={combinedStyle} />;
};

export default VortexShader;
