'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ParticleAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Add lighting to the scene for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Store initial positions
    const initialPositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      initialPositions[i] = posArray[i] ?? 0;
    }

    // Create a circle texture for particles with glow effect
    function createCircleTexture() {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext('2d');
      if (context) {
        const center = size / 2;
        const radius = size / 2;

        // Create a radial gradient for a glowing effect
        const gradient = context.createRadialGradient(
          center, center, 0,
          center, center, radius
        );
        gradient.addColorStop(0, '#4facfe'); // Bright cyan-blue core
        gradient.addColorStop(0.7, '#5f2c82'); // Rich purple
        gradient.addColorStop(1, 'rgba(95, 44, 130, 0)'); // Fade to transparent

        context.beginPath();
        context.arc(center, center, radius, 0, 2 * Math.PI, false);
        context.fillStyle = gradient;
        context.fill();
      }

      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    const particleTexture = createCircleTexture();
    // Make particles slightly larger for better visibility
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.07, // Increased from 0.05
      map: particleTexture,
      transparent: true,
      alphaTest: 0.1,
      blending: THREE.AdditiveBlending,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create line geometry and material
    const lineGeometry = new THREE.BufferGeometry();
    // Update line material color
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Bright cyan for lines
      linewidth: 1,
      transparent: true,
      opacity: 0.8,
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    camera.position.z = 2;

    // Mouse movement
    const mouse = { x: 0, y: 0, screenX: 0, screenY: 0 };

    function onMouseMove(event: MouseEvent): void {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouse.screenX = event.clientX;
      mouse.screenY = event.clientY;
    }

    window.addEventListener('mousemove', onMouseMove);

    // Helper to get mouse position in world coordinates at z=0
    function getMouseWorldPosition() {
      const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      vector.unproject(camera);

      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      return pos;
    }

    // Animation loop
    const animate = (): void => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.00005;
      const positionAttribute = particlesGeometry.attributes.position;

      if (positionAttribute && positionAttribute.array instanceof Float32Array) {
        const positions = positionAttribute.array as Float32Array;

        for (let i = 0; i < particlesCount; i++) {
          const i3 = i * 3;

          const speed = 0.0015;
          positions[i3] = (positions[i3] ?? 0) + Math.sin(time + i * 0.1) * speed;
          positions[i3 + 1] = (positions[i3 + 1] ?? 0) + Math.cos(time + i * 0.1) * speed * speed;
          positions[i3 + 2] = (positions[i3 + 2] ?? 0) + Math.sin(time + i * 0.1) * speed;

          // Check if the particle is too far from its initial position
          const dx = (positions[i3] ?? 0) - (initialPositions[i3] ?? 0);
          const dy = (positions[i3 + 1] ?? 0) - (initialPositions[i3 + 1] ?? 0);
          const dz = (positions[i3 + 2] ?? 0) - (initialPositions[i3 + 2] ?? 0);
          const distanceSquared = dx * dx + dy * dy + dz * dz;

          // If the particle is too far, reset its position
          if (distanceSquared > 15) {
            positions[i3] = initialPositions[i3] ?? 0;
            positions[i3 + 1] = initialPositions[i3 + 1] ?? 0;
            positions[i3 + 2] = initialPositions[i3 + 2] ?? 0;
          }
        }

        positionAttribute.needsUpdate = true;
      }

      if (positionAttribute && positionAttribute.array instanceof Float32Array) {
        const positions = positionAttribute.array;
        const linePositions = [];

        // Set your threshold in normalized device coordinates (NDC)
        const thresholdSquared = 0.02;

        // Assume mouse.x and mouse.y are in NDC (-1 to 1)
        const mouseNDC = new THREE.Vector2(mouse.x, mouse.y);

        for (let i = 0; i < particlesCount; i++) {
          const i3 = i * 3;

          // Get the particle position in world space
          const position = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

          // Project the position to normalized device coordinates (NDC)
          const projectedPosition = position.clone().project(camera);

          // Compute the squared distance in screen space
          const dx = projectedPosition.x - mouseNDC.x;
          const dy = projectedPosition.y - mouseNDC.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < thresholdSquared) {
            // Calculate opacity based on distance (closer = more opaque)
            const opacityFactor = 1 - (distanceSquared / thresholdSquared);

            // Add the particle position to the line positions
            linePositions.push(position.x, position.y, position.z);

            // Unproject the mouse position at the depth (z) of the particle
            const mousePosition = new THREE.Vector3(
              mouseNDC.x,
              mouseNDC.y,
              projectedPosition.z,
            ).unproject(camera);

            // Add the mouse world position to the line positions
            linePositions.push(mousePosition.x, mousePosition.y, mousePosition.z);

            // Add attraction force toward mouse for connected particles
            const attractionStrength = 0.02 * opacityFactor; // Closer particles move more

            // Apply attraction toward mouse
            positions[i3] = (positions[i3] ?? 0) + (mousePosition.x - (positions[i3] ?? 0)) * attractionStrength;
            positions[i3 + 1] = (positions[i3 + 1] ?? 0) + (mousePosition.y - (positions[i3 + 1] ?? 0)) * attractionStrength;
            positions[i3 + 2] = (positions[i3 + 2] ?? 0) + (mousePosition.z - (positions[i3 + 2] ?? 0)) * attractionStrength;
          }
        }

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeometry.computeBoundingSphere();
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="fixed top-0 left-0 -z-10 bg-surface" />;
};

export default ParticleAnimation;
