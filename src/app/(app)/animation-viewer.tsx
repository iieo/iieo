'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uDim;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 grad(vec2 i) {
  float a = hash(i) * 6.2831853;
  return vec2(cos(a), sin(a));
}

// Classic gradient (Perlin) noise, remapped to roughly 0..1
float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i), f);
  float b = dot(grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.5;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * perlin(p);
    p = r * p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}

// Volumetric-looking fog: stretched, domain-warped perlin, dense low and thin high
float fogDensity(vec2 p, float y, float base, float d, float t) {
  vec2 fp = vec2(p.x * 0.8 - t * 0.05 * (1.0 + d) + d * 9.0, y * 3.4 - d * 2.0);
  vec2 warp = vec2(fbm(fp + t * 0.05), fbm(fp + 5.2 - t * 0.04));
  float n = fbm(fp + warp * 1.4);
  float wisps = fbm(fp * vec2(2.2, 4.0) + warp * 2.0 - t * 0.03);
  n = mix(n, wisps, 0.35);
  float body = smoothstep(0.28, 0.72, n);
  float height = exp(-max(y - base, 0.0) * 5.0) * smoothstep(base - 0.5, base, y + 0.35);
  return clamp(body * height * 1.5, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = uTime;
  vec2 m = uMouse - 0.5;

  // Soft sky glow, low on the right
  vec2 glowPos = vec2(asp * 0.72 + sin(t * 0.15) * 0.05, 0.62 + sin(t * 0.11) * 0.03);
  float pulse = 1.0 + 0.12 * sin(t * 0.5);
  float col = 0.04 + 0.46 * pulse * exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 2.6);

  // High cloud streaks sliding across the sky
  float cloud = fbm(vec2(p.x * 0.9 - t * 0.05, p.y * 4.0 + fbm(p * 1.5 + t * 0.04) * 1.5));
  col += 0.1 * smoothstep(0.4, 0.8, cloud) * smoothstep(0.45, 0.9, uv.y);

  float wx = asp * 0.72;

  for (int i = 0; i < 4; i++) {
    float d = float(i) / 3.0;
    vec2 q = vec2(p.x + m.x * (0.01 + 0.04 * d) + t * 0.004 * (1.0 + d), p.y);

    // Ridge line: one smooth perlin curve per layer
    float h = 0.56 - d * 0.26;
    h += (fbm(vec2(q.x * (1.2 + d) + float(i) * 7.3, float(i) * 3.1 + t * 0.03)) - 0.5) * (0.22 + d * 0.12);
    h += sin(t * (0.25 + d * 0.1) + float(i) * 2.0) * 0.006;

    if (i == 3) {
      h += 0.13 * exp(-pow((q.x - wx) / 0.12, 2.0));
    }

    float edge = 1.5 / uRes.y;
    col = mix(col, mix(0.3, 0.0, d), smoothstep(h + edge, h - edge, uv.y));

    // Fog pools at the foot of each ridge and catches the light from the glow
    float fog = fogDensity(p, uv.y, h - 0.04, d, t);
    float lit = exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 1.8);
    float fogCol = mix(0.46, 0.3, d) + 0.34 * lit;
    col = mix(col, fogCol, fog * (0.92 - d * 0.12));
  }

  // A thin veil of fog in front of the foreground crag
  float veil = fogDensity(p + vec2(3.7, 0.0), uv.y, 0.12, 1.3, t);
  col = mix(col, 0.34 + 0.2 * exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 1.8), veil * 0.5);

  // Slow perlin flow across the whole frame, so the noise reads everywhere
  vec2 flow = vec2(fbm(p * 1.3 + t * 0.04), fbm(p * 1.3 - t * 0.035 + 8.0));
  float field = fbm(p * 2.2 + flow * 2.2 + vec2(t * 0.03, 0.0));
  col *= 0.65 + 0.7 * field;
  col += 0.05 * smoothstep(0.45, 0.75, field);

  // Very faint grain to avoid banding
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  // Vignette, plus a darker left side so the type stays readable
  vec2 vc = uv - 0.5;
  col *= 1.0 - 0.7 * pow(length(vc * vec2(1.0, 1.15)) * 1.15, 2.2);
  float leftShade = mix(0.85, 0.5, smoothstep(0.75, 0.0, uv.x) * step(1.0, asp));
  col *= mix(leftShade, 0.72, step(asp, 1.0));
  col *= 1.0 - 0.7 * uDim;

  gl_FragColor = vec4(vec3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

export default function AnimationViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uDim: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      uniforms.uRes.value.copy(size);
    };
    resize();
    window.addEventListener('resize', resize);

    const target = new THREE.Vector2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      target.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove);

    const main = document.querySelector('main');
    const onScroll = () => {
      if (!main) return;
      uniforms.uDim.value = Math.min(1, main.scrollTop / (window.innerHeight * 0.6));
    };
    main?.addEventListener('scroll', onScroll, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      if (!reduceMotion) {
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uMouse.value.lerp(target, 0.04);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      main?.removeEventListener('scroll', onScroll);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden bg-black" aria-hidden="true" />;
}
