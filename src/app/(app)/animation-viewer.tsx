"use client"

import FlowingInkEffect from "@/components/dripping-animation";
import ParticleAnimation from "@/components/particle-animation";
import VortexShader from "@/components/vortex-animation";

import React, { useState } from "react";

function AnimationViewer() {
    const animations = [
        <VortexShader key="vortex" />,
        <ParticleAnimation key="particle" />,
        <FlowingInkEffect key="ink" />
    ];
    const [current, setCurrent] = useState(0);

    const handleChange = () => {
        setCurrent((prev) => (prev + 1) % animations.length);
    };

    return (
        <div
            className="fixed inset-0 w-screen h-screen z-0 pointer-events-none"
            style={{ overflow: "hidden" }}
        >
            <button
                onClick={handleChange}
                className="absolute top-4 right-4 z-10 border-white border-2 rounded text-white px-6 py-4 hover:bg-surface hover:scale-105 transition-transform duration-200 pointer-events-auto"
            >
                Change background
            </button>
            {animations[current]}
        </div>
    );
}

export default AnimationViewer;
