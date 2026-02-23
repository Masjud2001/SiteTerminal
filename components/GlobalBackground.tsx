"use client";
import React, { useEffect, useRef } from 'react';

const GlobalBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // Particle system for the "Shodan 2000" digital starfield/grid look
        const particles: any[] = [];
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * canvas.width,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 2 + 0.5
            });
        }

        const draw = () => {
            // Clear with slight trail effect
            ctx.fillStyle = 'rgba(2, 2, 2, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            particles.forEach(p => {
                // Move particle towards screen (starfield effect)
                p.z -= p.speed;
                if (p.z <= 0) {
                    p.z = canvas.width;
                    p.x = Math.random() * canvas.width;
                    p.y = Math.random() * canvas.height;
                }

                // Project 3D to 2D
                const k = 128 / p.z;
                const px = (p.x - centerX) * k + centerX;
                const py = (p.y - centerY) * k + centerY;

                if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
                    const size = p.size * k;
                    const alpha = 1 - (p.z / canvas.width);

                    ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.5})`; // Emerald green
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Add subtle grid
            ctx.strokeStyle = 'rgba(0, 255, 65, 0.03)';
            ctx.lineWidth = 1;
            const gridSize = 50;

            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-[#020202]">
            <canvas
                ref={canvasRef}
                className="block w-full h-full opacity-60"
            />
            {/* Overlay to ensure readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-40 pointer-events-none" />
        </div>
    );
};

export default GlobalBackground;
