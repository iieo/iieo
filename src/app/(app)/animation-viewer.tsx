'use client';

import { motion } from 'framer-motion';

const blobs = [
  {
    className: 'w-[min(700px,90vw)] h-[min(700px,90vw)] bg-[rgba(168,85,247,0.45)]',
    x: [0, 200, -100, 300, -150, 50, 0],
    y: [0, 150, -100, -200, 100, 250, 0],
    scale: [1, 1.2, 0.9, 1.15, 0.85, 1.1, 1],
    duration: 28,
    style: { top: '-10%', left: '-5%' },
  },
  {
    className: 'w-[min(600px,80vw)] h-[min(600px,80vw)] bg-[rgba(244,63,94,0.35)]',
    x: [0, -180, 120, -250, 80, -60, 0],
    y: [0, -120, 200, -80, -180, 100, 0],
    scale: [1, 0.85, 1.15, 0.95, 1.2, 0.9, 1],
    duration: 34,
    style: { top: '30%', right: '-10%' },
  },
  {
    className: 'w-[min(550px,75vw)] h-[min(550px,75vw)] bg-[rgba(56,189,248,0.35)]',
    x: [0, 150, -200, 100, -120, 220, 0],
    y: [0, -180, 80, 200, -60, -140, 0],
    scale: [1, 1.15, 0.85, 1.1, 0.95, 1.2, 1],
    duration: 24,
    style: { bottom: '-5%', left: '20%' },
  },
  {
    className: 'w-[min(400px,60vw)] h-[min(400px,60vw)] bg-[rgba(52,211,153,0.3)]',
    x: [0, -120, 180, -80, 200, -150, 0],
    y: [0, 200, -150, 100, -100, 180, 0],
    scale: [1, 1.1, 0.9, 1.2, 0.85, 1.05, 1],
    duration: 26,
    style: { top: '50%', left: '40%' },
  },
];

export default function AnimationViewer() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black" aria-hidden="true">
      <div className="absolute inset-0 bg-noise opacity-[0.035]" />
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[100px] ${blob.className}`}
          style={blob.style}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: 1,
            x: blob.x,
            y: blob.y,
            scale: blob.scale,
          }}
          transition={{
            opacity: { duration: 2, delay: i * 0.3 },
            x: { duration: blob.duration, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: blob.duration, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: blob.duration, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}
    </div>
  );
}
