"use client";

import { useEffect, useRef } from "react";

// Petite animation de confettis en canvas, sans dépendance externe. Se
// déclenche à chaque montage du composant (donc à chaque ouverture de la
// page d'accueil le jour de l'anniversaire de la personne connectée — voir
// src/app/page.tsx).
const COULEURS = ["#ec1c24", "#1c1c1c", "#f5b400", "#2f9e44", "#1971c2", "#e64980"];

interface Particule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  taille: number;
  couleur: string;
  rotation: number;
  vRotation: number;
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function redimensionner() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    redimensionner();
    window.addEventListener("resize", redimensionner);

    const particules: Particule[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      taille: 4 + Math.random() * 6,
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
    }));

    let frame = 0;
    let animationId: number;
    const dureeFrames = 60 * 6; // ~6 secondes à 60fps

    function dessiner() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particules) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.couleur;
        ctx.fillRect(-p.taille / 2, -p.taille / 4, p.taille, p.taille / 2);
        ctx.restore();
      }
      frame++;
      if (frame < dureeFrames) {
        animationId = requestAnimationFrame(dessiner);
      } else if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    animationId = requestAnimationFrame(dessiner);

    return () => {
      window.removeEventListener("resize", redimensionner);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}
