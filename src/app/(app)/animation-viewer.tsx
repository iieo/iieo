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
uniform float uScroll;
uniform vec2 uSeed;
uniform vec2 uVel;

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

// Flow noise (Perlin & Neyret): the lattice gradients rotate over time, so the pattern
// evolves in place instead of repeating, while advection gives it a clear direction
float flowNoise(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 g00 = vec2(0.0), g10 = vec2(1.0, 0.0), g01 = vec2(0.0, 1.0), g11 = vec2(1.0);
  float h00 = hash(i), h10 = hash(i + g10), h01 = hash(i + g01), h11 = hash(i + g11);
  float a = dot(vec2(cos(h00 * 6.2831853 + t * (h00 - 0.5)), sin(h00 * 6.2831853 + t * (h00 - 0.5))), f);
  float b = dot(vec2(cos(h10 * 6.2831853 + t * (h10 - 0.5)), sin(h10 * 6.2831853 + t * (h10 - 0.5))), f - g10);
  float c = dot(vec2(cos(h01 * 6.2831853 + t * (h01 - 0.5)), sin(h01 * 6.2831853 + t * (h01 - 0.5))), f - g01);
  float e = dot(vec2(cos(h11 * 6.2831853 + t * (h11 - 0.5)), sin(h11 * 6.2831853 + t * (h11 - 0.5))), f - g11);
  return mix(mix(a, b, u.x), mix(c, e, u.x), u.y) * 0.5 + 0.5;
}

float flowFbm(vec2 p, float t) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * flowNoise(p, t);
    p = r * p * 2.03 + 17.0;
    t *= 1.5;
    a *= 0.5;
  }
  return v;
}

const vec2 FOG_DIR = vec2(1.0, -0.06);

// Volumetric-looking fog: stretched, domain-warped flow noise, dense low and thin high
float fogDensity(vec2 p, vec2 sp, float y, float base, float d, float t) {
  vec2 fp = vec2(p.x * 0.8 + d * 9.0, y * 3.4 - d * 2.0) + uSeed;

  // The cursor stirs a small swirl only where it is, the rest keeps flowing
  vec2 mp = vec2(uMouse.x * (uRes.x / uRes.y), 1.0 - uMouse.y);
  vec2 rel = sp - mp;
  float near = exp(-dot(rel, rel) / 0.02);
  fp += near * (vec2(-rel.y, rel.x) * 0.25 - uVel * vec2(0.15, -0.35));

  // Everything, the warp included, is advected along one direction
  fp -= FOG_DIR * t * 0.06 * (1.0 + d);
  float evo = t * 0.25;

  vec2 warp = vec2(flowFbm(fp * 0.7, evo), flowFbm(fp * 0.7 + 5.2, evo + 3.0));
  float n = flowFbm(fp + warp * 1.3, evo * 1.3);
  float wisps = flowFbm(fp * vec2(2.2, 4.0) + warp * 2.0, evo * 1.8);
  n = mix(n, wisps, 0.35);
  float body = smoothstep(0.28, 0.72, n);
  float height = exp(-max(y - base, 0.0) * 5.0) * smoothstep(base - 0.5, base, y + 0.35);
  return clamp(body * height * 1.5 * (1.0 - 0.05 * near), 0.0, 1.0);
}

// Sun shafts fanning out from the glow, broken up by slowly drifting perlin
float sunRays(vec2 p, vec2 src, float t) {
  vec2 rd = p - src;
  float r = length(rd);
  vec2 dir = rd / max(r, 1e-4);
  float s = perlin(dir * 5.0 + vec2(t * 0.04, -t * 0.03) + uSeed * 0.01);
  s = 0.6 * s + 0.4 * perlin(dir * 13.0 + vec2(-t * 0.06, t * 0.05));
  float shafts = smoothstep(0.5, 0.78, s);
  float downward = smoothstep(0.35, -0.7, dir.y);
  return shafts * downward * exp(-r * 1.3) * smoothstep(0.02, 0.18, r);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = uTime;
  vec2 m = uMouse - 0.5;

  // Soft sky glow, low on the right
  vec2 glowPos = vec2(asp * 0.72 + sin(t * 0.15) * 0.05 - uScroll * 0.06, 0.62 + sin(t * 0.11) * 0.03 + uScroll * 0.05);
  float pulse = 1.0 + 0.12 * sin(t * 0.5);
  float col = 0.04 + 0.46 * pulse * exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 2.6);

  // High cloud streaks sliding across the sky
  float cloud = fbm(vec2(p.x * 0.9 - t * 0.05, p.y * 4.0 + fbm(p * 1.5 + t * 0.04) * 1.5));
  col += 0.1 * smoothstep(0.4, 0.8, cloud) * smoothstep(0.45, 0.9, uv.y);

  float wx = asp * 0.72;
  float fogSum = 0.0;

  for (int i = 0; i < 4; i++) {
    float d = float(i) / 3.0;
    vec2 q = vec2(p.x + m.x * (0.01 + 0.04 * d) + t * 0.004 * (1.0 + d) + uScroll * (0.05 + 0.25 * d), p.y);

    // Ridge line: one smooth perlin curve per layer
    float h = 0.56 - d * 0.26;
    h += (fbm(vec2(q.x * (1.2 + d) + float(i) * 7.3, float(i) * 3.1 + t * 0.03)) - 0.5) * (0.22 + d * 0.12);
    h += sin(t * (0.25 + d * 0.1) + float(i) * 2.0) * 0.006;

    if (i == 3) {
      h += 0.13 * exp(-pow((q.x - wx) / 0.12, 2.0));
    }

    h -= uScroll * 0.03 * (0.4 + d);

    float edge = 1.5 / uRes.y;
    col = mix(col, mix(0.3, 0.0, d), smoothstep(h + edge, h - edge, uv.y));

    // Fog pools at the foot of each ridge and catches the light from the glow
    float fog = fogDensity(vec2(p.x + uScroll * 0.5 * (1.0 + d), p.y), p, uv.y, h - 0.04, d, t);
    float lit = exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 1.8);
    float fogCol = mix(0.46, 0.3, d) + 0.34 * lit;
    col = mix(col, fogCol, fog * (0.92 - d * 0.12));
    fogSum = max(fogSum, fog);
  }

  // A thin veil of fog in front of the foreground crag
  float veil = fogDensity(p + vec2(3.7 + uScroll * 1.1, 0.0), p, uv.y, 0.12, 1.3, t);
  col = mix(col, 0.34 + 0.2 * exp(-length((p - glowPos) * vec2(0.8, 1.4)) * 1.8), veil * 0.5);
  fogSum = max(fogSum, veil);

  // Light only becomes visible where it scatters, so the shafts glow brightest inside the fog
  col += 0.12 * sunRays(p, glowPos, t) * (0.25 + 0.9 * fogSum);

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
      uScroll: { value: 0 },
      uSeed: { value: new THREE.Vector2(Math.random() * 200, Math.random() * 200) },
      uVel: { value: new THREE.Vector2(0, 0) },
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
    const velTarget = new THREE.Vector2(0, 0);
    const last = new THREE.Vector2(NaN, NaN);
    const onMove = (e: PointerEvent) => {
      target.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
      if (!Number.isNaN(last.x)) {
        velTarget.x += ((e.clientX - last.x) / window.innerWidth) * 4;
        velTarget.y += ((e.clientY - last.y) / window.innerHeight) * 4;
        velTarget.clampLength(0, 0.4);
      }
      last.set(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', onMove);

    const main = document.querySelector('main');
    let scrollTarget = 0;
    const onScroll = () => {
      if (!main) return;
      uniforms.uDim.value = Math.min(1, main.scrollTop / (window.innerHeight * 0.6));
      scrollTarget = main.scrollTop / window.innerHeight;
    };
    main?.addEventListener('scroll', onScroll, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      if (!reduceMotion) {
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uMouse.value.lerp(target, 0.08);
        velTarget.multiplyScalar(0.94);
        uniforms.uVel.value.lerp(velTarget, 0.1);
      }
      uniforms.uScroll.value += (scrollTarget - uniforms.uScroll.value) * 0.06;
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
