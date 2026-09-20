"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeFluxPreviewProps {
  status?: "READY" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName?: string;
}

export default function ThreeFluxPreview({
  status = "READY"
}: ThreeFluxPreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 240;

    // Scène, Caméra & Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060a17, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 1. Cœur 3D Holographique (Icosaèdre à facettes métalliques)
    const geometry = new THREE.IcosahedronGeometry(1.6, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.25,
      metalness: 0.85,
      roughness: 0.2,
      wireframe: false,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(geometry, material);
    scene.add(coreMesh);

    // 2. Cage filaire externe 3D (Wireframe Octahedron)
    const wireGeo = new THREE.OctahedronGeometry(2.3, 0);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireMesh);

    // 3. Anneaux d'orbite 3D
    const ringGeo = new THREE.TorusGeometry(2.7, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.6,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 4;
    scene.add(ring2);

    // 4. Nuage de particules 3D galactique
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Éclairages dynamiques
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 3, 50);
    pointLightCyan.position.set(4, 3, 5);
    scene.add(pointLightCyan);

    const pointLightPurple = new THREE.PointLight(0x8b5cf6, 2.5, 50);
    pointLightPurple.position.set(-4, -3, 3);
    scene.add(pointLightPurple);

    // Gestion de la souris pour inclinaison 3D interactive
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      mouseX = (x / rect.width) * 2;
      mouseY = (y / rect.height) * 2;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Redimensionnement
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Boucle d'animation
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Vitesse selon statut
      const speed = status === "PROCESSING" || status === "UPLOADING" ? 2.5 : 0.8;

      // Rotation continue
      coreMesh.rotation.y += 0.008 * speed;
      coreMesh.rotation.x += 0.005 * speed;

      wireMesh.rotation.y -= 0.006 * speed;
      wireMesh.rotation.z += 0.004 * speed;

      ring1.rotation.z += 0.01 * speed;
      ring2.rotation.z -= 0.008 * speed;

      particles.rotation.y = elapsedTime * 0.03;

      // Suivi fluide du curseur (3D parallax)
      targetRotY = mouseX * 0.5;
      targetRotX = -mouseY * 0.5;
      scene.rotation.y += (targetRotY - scene.rotation.y) * 0.05;
      scene.rotation.x += (targetRotX - scene.rotation.x) * 0.05;

      // Changement de couleur dynamique selon l'état
      if (status === "COMPLETED") {
        material.emissive.setHex(0x10b981);
        wireMat.color.setHex(0x34d399);
      } else if (status === "PROCESSING") {
        material.emissive.setHex(0x3b82f6);
        const pulse = Math.sin(elapsedTime * 8) * 0.25 + 0.5;
        material.emissiveIntensity = pulse;
      } else {
        material.emissive.setHex(0x06b6d4);
        material.emissiveIntensity = 0.3;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [status]);

  return (
    <div className="relative w-full h-full min-h-[220px] flex items-center justify-center overflow-hidden rounded bg-gradient-to-b from-[#050814] to-[#0a1128]">
      {/* Canevas WebGL Three.js */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Grille 3D Perspective en arrière-plan */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56, 189, 248, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.2) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          transform: "perspective(300px) rotateX(45deg) translateY(40px)",
        }}
      />

      {/* Overlay UI 3D avec badges et statut */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/40 text-[10px] font-mono text-cyan-300 font-bold backdrop-blur-md shadow-sm">
          3D ENGINE READY
        </span>
        {status === "PROCESSING" && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono text-amber-300 font-bold animate-pulse">
            TRANSMUTATION...
          </span>
        )}
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex items-center justify-between text-[11px] font-mono text-slate-300">
        <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded border border-white/10">
          <span className="text-cyan-400 font-bold">MODE :</span> {fileName ? fileName : "UNIVERSAL FLUX"}
        </div>
        <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-slate-400">
          60 FPS • THREE.JS
        </div>
      </div>
    </div>
  );
}
