"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FilePlus,
  Wand2,
  Scissors,
  Box,
  Sliders,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Camera,
  Folder,
  Volume2,
  RefreshCw,
  Download,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  HelpCircle,
  Layers,
  ChevronDown,
  X,
  Sparkles,
  Eye
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  fetchPresets,
  requestUploadUrl,
  uploadFileDirect,
  createConversionJob,
  getJobStatus,
  listRecentJobs,
  deleteJob,
  JobResponse,
  PresetCategory
} from "@/lib/api";

// Chargement dynamique du composant 3D Three.js pour éviter les problèmes de SSR
const ThreeFluxPreview = dynamic(() => import("@/components/ThreeFluxPreview"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[220px] bg-[#070b18] flex items-center justify-center text-xs text-blue-400 font-mono">
      Initialisation de la scène 3D...
    </div>
  )
});

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  ext: string;
  category: string;
  targetFormat: string;
  previewUrl?: string;
  status: "READY" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  stage: string;
  jobId?: string;
  downloadUrl?: string;
  errorMessage?: string;
}

export default function Home() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetCategory[]>([]);
  const [globalProfile, setGlobalProfile] = useState<string>("mp4");
  const [destinationPath, setDestinationPath] = useState<string>("/AlteraFlux/Exports/Converted/");
  const [mergeFiles, setMergeFiles] = useState<boolean>(false);
  const [isConvertingAll, setIsConvertingAll] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<"3d" | "video">("3d");

  // Lecteur Aperçu
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(100);
  const [volume, setVolume] = useState<number>(80);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Modal Paramètres
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [options, setOptions] = useState({
    quality: "high",
    resolution: "original",
    audio_bitrate: "192k",
    ai_translation: true,
    include_comments: true
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPresets();
    loadHistory();
  }, []);

  const loadPresets = async () => {
    const data = await fetchPresets();
    setPresets(data);
  };

  const loadHistory = async () => {
    try {
      await listRecentJobs();
    } catch {}
  };

  // Ajout de fichiers
  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: QueuedFile[] = Array.from(fileList).map((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      let cat = "document";
      if (["mp4", "mkv", "avi", "mov", "webm", "flv"].includes(ext)) cat = "video";
      else if (["mp3", "wav", "aac", "flac", "ogg", "m4a"].includes(ext)) cat = "audio";
      else if (["png", "jpg", "jpeg", "webp", "avif", "gif", "ico"].includes(ext)) cat = "image";
      else if (["py", "js", "ts", "cpp", "rs", "go", "json", "yaml", "toml"].includes(ext)) cat = "code";

      let defaultTarget = "mp4";
      if (cat === "video") defaultTarget = "mp4";
      else if (cat === "audio") defaultTarget = "mp3";
      else if (cat === "image") defaultTarget = "webp";
      else if (cat === "code") defaultTarget = ext === "py" ? "ts" : "py";
      else defaultTarget = "pdf";

      const previewUrl = f.type.startsWith("video") || f.type.startsWith("audio") || f.type.startsWith("image")
        ? URL.createObjectURL(f)
        : undefined;

      return {
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        name: f.name,
        size: f.size,
        ext,
        category: cat,
        targetFormat: defaultTarget,
        previewUrl,
        status: "READY",
        progress: 0,
        stage: "Prêt"
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
    if (!selectedFileId && newItems.length > 0) {
      setSelectedFileId(newItems[0].id);
    }
  };

  const selectedItem = files.find((f) => f.id === selectedFileId) || files[0] || null;

  // Gestion du lecteur vidéo
  const togglePlay = () => {
    if (!videoRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Lancement de conversion d'un fichier
  const startConversionForFile = async (fileItem: QueuedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: "UPLOADING", stage: "Téléversement...", progress: 5 } : f))
    );

    try {
      const presigned = await requestUploadUrl(fileItem.name, fileItem.file.type, fileItem.size);

      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, stage: "Envoi direct vers stockage S3...", progress: 20 } : f))
      );
      await uploadFileDirect(presigned.upload_url, fileItem.file, presigned.headers);

      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: "PROCESSING", stage: "Transmutation 3D en cours...", progress: 35 } : f))
      );
      const job = await createConversionJob({
        filename: fileItem.name,
        source_key: presigned.key,
        source_format: fileItem.ext,
        target_format: fileItem.targetFormat,
        category: fileItem.category,
        source_size_bytes: fileItem.size,
        options
      });

      listenToJob(fileItem.id, job.id);
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: "FAILED", stage: "Échec", errorMessage: err.message || "Erreur de conversion" }
            : f
        )
      );
    }
  };

  const listenToJob = (fileId: string, jobId: string) => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000") + `/ws/jobs/${jobId}`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id !== fileId) return f;
              const isDone = data.status === "COMPLETED";
              const isFail = data.status === "FAILED";
              return {
                ...f,
                status: isDone ? "COMPLETED" : isFail ? "FAILED" : "PROCESSING",
                progress: data.progress ?? f.progress,
                stage: data.stage || f.stage,
                downloadUrl: data.download_url || f.downloadUrl,
                errorMessage: data.error_message || f.errorMessage
              };
            })
          );
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            ws.close();
          }
        } catch {}
      };
      ws.onerror = () => pollSingleJob(fileId, jobId);
    } catch {
      pollSingleJob(fileId, jobId);
    }
  };

  const pollSingleJob = (fileId: string, jobId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await getJobStatus(jobId);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== fileId) return f;
            const isDone = res.status === "COMPLETED";
            const isFail = res.status === "FAILED";
            return {
              ...f,
              status: isDone ? "COMPLETED" : isFail ? "FAILED" : "PROCESSING",
              progress: res.progress,
              stage: res.stage,
              downloadUrl: res.download_url,
              errorMessage: res.error_message
            };
          })
        );
        if (res.status === "COMPLETED" || res.status === "FAILED") {
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleConvertAll = async () => {
    if (files.length === 0) return;
    setIsConvertingAll(true);
    for (const f of files) {
      if (f.status !== "COMPLETED") {
        await startConversionForFile(f);
      }
    }
    setIsConvertingAll(false);
  };

  const handleApplyToAll = () => {
    setFiles((prev) => prev.map((f) => ({ ...f, targetFormat: globalProfile })));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans antialiased select-none p-2 sm:p-4">
      {/* --- FENÊTRE PRINCIPALE FLOTTANTE EN 3D --- */}
      <div className="window-3d max-w-[1720px] w-full mx-auto flex flex-col flex-1 overflow-hidden">
        {/* --- EN-TÊTE SUPÉRIEUR BLEU PRO STUDIO AVEC RELIEF 3D --- */}
        <header className="bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#1d4ed8] text-white px-4 py-2.5 flex items-center justify-between border-b border-blue-900/50 shadow-md">
          <div className="flex items-center gap-3">
            {/* Bouton 3D Tactile Ajouter Fichier */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-3d-secondary flex items-center gap-2 px-3 py-1.5 text-xs text-blue-950 font-bold tracking-wide"
              >
                <FilePlus className="w-4 h-4 text-blue-600" />
                <span>Ajouter Fichier</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </div>

            {/* Outils de la barre supérieure */}
            <div className="hidden md:flex items-center gap-1.5 border-l border-white/20 pl-3">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/15 text-xs text-white/95 transition font-medium"
              >
                <Wand2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>Améliorer la vidéo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/15 text-xs text-white/95 transition font-medium"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-300" />
                <span>Couper</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode(previewMode === "3d" ? "video" : "3d")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition font-bold ${
                  previewMode === "3d"
                    ? "bg-cyan-400/25 text-cyan-200 border border-cyan-400/40 shadow-sm"
                    : "hover:bg-white/15 text-white/95"
                }`}
              >
                <Box className="w-3.5 h-3.5 text-cyan-300" />
                <span>Vue 3D Active</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/15 text-xs text-white/95 transition font-medium"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-300" />
                <span>Édition</span>
              </button>
            </div>
          </div>

          {/* Titre 3D & Statut */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="tracking-wide">AlteraFlux Studio 3D</span>
            </div>
            <a
              href="https://github.com/ycntrader-12/AlteraFlux.git"
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-blue-200 hidden sm:inline text-[11px]"
            >
              GitHub v1.0
            </a>
          </div>
        </header>

        {/* --- CORPS DE TRAVAIL : 2 COLONNES --- */}
        <div className="flex-1 flex flex-col md:flex-row p-3.5 gap-3.5 overflow-hidden bg-slate-50/50">
          {/* COLONNE GAUCHE: LISTE DES FICHIERS / MISE EN ROUTE 3D */}
          <div className="flex-1 bg-white border border-[#cbd5e1] rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[440px]">
            {files.length === 0 ? (
              /* --- VUE MISE EN ROUTE 3D AVEC CARTES EN RELIEF --- */
              <div
                className="flex-1 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-50/80 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="max-w-xl text-left bg-white p-8 rounded-xl shadow-lg border border-slate-200/80 card-3d">
                  <div className="flex items-center gap-2 mb-6">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mise en route</h1>
                    <span className="badge-3d px-2.5 py-0.5 border border-blue-500 bg-blue-50 text-blue-600 text-xs font-black">
                      4K
                    </span>
                    <span className="badge-3d px-2.5 py-0.5 border border-blue-500 bg-blue-50 text-blue-600 text-xs font-black">
                      UHD
                    </span>
                    <span className="badge-3d px-2.5 py-0.5 border border-blue-500 bg-blue-50 text-blue-600 text-xs font-black">
                      HEVC
                    </span>
                    <span className="badge-3d px-2.5 py-0.5 border border-indigo-500 bg-indigo-50 text-indigo-600 text-xs font-black">
                      3D AI
                    </span>
                  </div>

                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-blue-50/50 transition">
                      <div className="step-number-3d">1</div>
                      <p>
                        Cliquez sur{" "}
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 shadow-sm">
                          <FilePlus className="w-3.5 h-3.5" /> Ajouter Fichier
                        </span>{" "}
                        pour importer des médias, documents ou code.
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-blue-50/50 transition">
                      <div className="step-number-3d">2</div>
                      <p>
                        Utilisez les outils d&apos;ajustement{" "}
                        <Wand2 className="w-3.5 h-3.5 inline text-blue-600" /> ,{" "}
                        <Scissors className="w-3.5 h-3.5 inline text-blue-600" /> et{" "}
                        <Box className="w-3.5 h-3.5 inline text-blue-600" /> pour couper et configurer la sortie.
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-blue-50/50 transition">
                      <div className="step-number-3d">3</div>
                      <p>
                        Sélectionnez le format de conversion à partir de la liste déroulante{" "}
                        <span className="font-bold text-slate-900">&quot;Profil&quot;</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-blue-50/50 transition">
                      <div className="step-number-3d">4</div>
                      <p>
                        Cliquez sur le bouton 3D{" "}
                        <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 bg-blue-600 text-white rounded text-xs shadow">
                          <RefreshCw className="w-3 h-3" /> Convertir
                        </span>{" "}
                        pour lancer le traitement asynchrone.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center font-medium">
                    Glissez et déposez simplement vos fichiers n&apos;importe où sur cette zone.
                  </div>
                </div>
              </div>
            ) : (
              /* --- LISTE DES FICHIERS EN COURS / FILE D'ATTENTE --- */
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Fichiers en file ({files.length})</span>
                  <span className="text-slate-400 font-normal">Sélectionnez un élément pour le visualiser en 3D</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {files.map((item) => {
                    const isSelected = item.id === selectedFileId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedFileId(item.id)}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected ? "bg-blue-50/90 border-l-4 border-blue-600 shadow-sm" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center font-black text-xs uppercase text-slate-700 shadow-sm">
                            {item.ext}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-xs text-slate-800 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {(item.size / (1024 * 1024)).toFixed(2)} Mo • Cible :{" "}
                              <span className="font-bold text-blue-600 uppercase">{item.targetFormat}</span>
                            </p>
                            {item.stage && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5">
                                {item.stage} {item.progress > 0 && `(${Math.round(item.progress)}%)`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.status === "PROCESSING" && (
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}

                          {item.status === "COMPLETED" && (
                            <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Converti</span>
                            </span>
                          )}

                          {item.status === "FAILED" && (
                            <span className="flex items-center gap-1 text-rose-600 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Erreur</span>
                            </span>
                          )}

                          <select
                            value={item.targetFormat}
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = e.target.value;
                              setFiles((prev) =>
                                prev.map((f) => (f.id === item.id ? { ...f, targetFormat: val } : f))
                              );
                            }}
                            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium shadow-sm focus:outline-none focus:border-blue-500"
                          >
                            <option value="mp4">MP4 Video</option>
                            <option value="mp3">MP3 Audio</option>
                            <option value="webm">WebM Video</option>
                            <option value="gif">GIF Animé</option>
                            <option value="webp">WebP Image</option>
                            <option value="pdf">PDF Document</option>
                            <option value="docx">Word DOCX</option>
                            <option value="ts">TypeScript</option>
                            <option value="py">Python</option>
                          </select>

                          {item.downloadUrl && (
                            <a
                              href={item.downloadUrl}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                              title="Télécharger le fichier converti"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE: PANNEAU APERÇU 3D STUDIO */}
          <div className="w-full md:w-[390px] lg:w-[430px] bg-white border border-[#cbd5e1] rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Box className="w-4 h-4 text-blue-600" />
                <span>Aperçu & Rendu 3D</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode("3d")}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    previewMode === "3d" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  3D Core
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("video")}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    previewMode === "video" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Lecteur
                </button>
              </div>
            </div>

            {/* Écran d'affichage : 3D WebGL Canvas ou Lecteur Vidéo */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#060a17] flex items-center justify-center">
              {previewMode === "video" && selectedItem?.previewUrl && selectedItem.file.type.startsWith("video") ? (
                <video
                  ref={videoRef}
                  src={selectedItem.previewUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                /* Scène 3D Interactive Three.js */
                <ThreeFluxPreview
                  status={selectedItem?.status || "READY"}
                  fileName={selectedItem?.name}
                />
              )}
            </div>

            {/* Timeline Défilement */}
            <div className="bg-[#f8fafc] px-3 pt-2 pb-1 border-t border-[#cbd5e1] flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 mx-2 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span>{formatTime(duration)}</span>
            </div>

            {/* Barre de contrôles physiques 3D */}
            <div className="bg-[#f1f5f9] px-3 py-2 border-t border-[#cbd5e1] flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTime(0);
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                  className="btn-3d-secondary p-1 text-slate-700"
                  title="Début"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md active:translate-y-0.5 transition"
                  title={isPlaying ? "Pause" : "Lecture"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    if (videoRef.current) {
                      videoRef.current.pause();
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  className="btn-3d-secondary p-1 text-slate-700"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5 fill-slate-600" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentTime((t) => Math.min(t + 5, duration));
                    if (videoRef.current) videoRef.current.currentTime += 5;
                  }}
                  className="btn-3d-secondary p-1 text-slate-700"
                  title="Avancer 5s"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Outils & Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert("Capture 3D sauvegardée avec succès !")}
                  className="btn-3d-secondary p-1 text-slate-700"
                  title="Capture photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => alert(`Dossier cible : ${destinationPath}`)}
                  className="btn-3d-secondary p-1 text-slate-700"
                  title="Ouvrir le dossier cible"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 pl-1 border-l border-slate-300">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setVolume(v);
                      if (videoRef.current) videoRef.current.volume = v / 100;
                    }}
                    className="w-14 h-1 bg-slate-300 rounded appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- BARRE INFÉRIEURE : PROFIL, PARAMÈTRES & GROS BOUTON 3D CONVERTIR --- */}
        <footer className="bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] border-t border-[#cbd5e1] p-3.5 shadow-inner">
          <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Options et Destination */}
            <div className="flex-1 w-full flex flex-col gap-2.5 text-xs">
              {/* Ligne 1 : Profil */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-slate-800 w-20 tracking-wide">Profil :</span>
                <div className="relative flex-1 max-w-md">
                  <select
                    value={globalProfile}
                    onChange={(e) => setGlobalProfile(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-md px-3 py-1.5 text-xs text-slate-800 font-semibold shadow-sm focus:outline-none focus:border-blue-500"
                  >
                    <optgroup label="Formats Vidéo">
                      <option value="mp4">MPEG-4 Video (*.mp4) - Standard Universel</option>
                      <option value="webm">WebM Video (*.webm) - Optimisé Web</option>
                      <option value="mkv">MKV Video (*.mkv) - Matroska HD</option>
                      <option value="gif">GIF Animé (*.gif) - Boucle dynamique</option>
                    </optgroup>
                    <optgroup label="Formats Audio">
                      <option value="mp3">MP3 Audio (*.mp3) - Haute Compatibilité</option>
                      <option value="wav">WAV Audio (*.wav) - PCM Master Studio</option>
                      <option value="flac">FLAC Audio (*.flac) - Sans perte</option>
                    </optgroup>
                    <optgroup label="Formats Image">
                      <option value="webp">WebP Image (*.webp) - Compression W3C</option>
                      <option value="png">PNG Image (*.png) - Transparence alpha</option>
                      <option value="ico">ICO Favicon (*.ico) - Multi-résolution</option>
                    </optgroup>
                    <optgroup label="Formats Document">
                      <option value="pdf">PDF Document (*.pdf) - Rendu vectoriel</option>
                      <option value="docx">Microsoft Word (*.docx)</option>
                      <option value="md">Markdown (*.md)</option>
                    </optgroup>
                    <optgroup label="Transpilation Code & IA">
                      <option value="ts">TypeScript (*.ts) - Typage strict</option>
                      <option value="py">Python (*.py) - Script propre</option>
                      <option value="cpp">C++ 20 (*.cpp) - Performance native</option>
                      <option value="rs">Rust (*.rs) - Sécurité mémoire</option>
                    </optgroup>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="btn-3d-secondary px-3.5 py-1.5 text-xs"
                >
                  Paramètres
                </button>

                <button
                  type="button"
                  onClick={handleApplyToAll}
                  className="btn-3d-secondary px-3.5 py-1.5 text-xs"
                >
                  Appliquer à Tous
                </button>
              </div>

              {/* Ligne 2 : Destination */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-slate-800 w-20 tracking-wide">Destination :</span>
                <input
                  type="text"
                  value={destinationPath}
                  onChange={(e) => setDestinationPath(e.target.value)}
                  className="flex-1 max-w-md bg-white border border-[#cbd5e1] rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono shadow-sm focus:outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => alert("Sélectionnez le répertoire de destination.")}
                  className="btn-3d-secondary px-3.5 py-1.5 text-xs"
                >
                  Parcourir
                </button>

                <button
                  type="button"
                  onClick={() => alert(`Dossier de destination : ${destinationPath}`)}
                  className="btn-3d-secondary px-3.5 py-1.5 text-xs"
                >
                  Ouvrir le dossier
                </button>

                <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={mergeFiles}
                    onChange={(e) => setMergeFiles(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Fusionner en un seul fichier</span>
                </label>
              </div>
            </div>

            {/* GROS BOUTON 3D BLEU "CONVERTIR" */}
            <div>
              <button
                type="button"
                disabled={files.length === 0 || isConvertingAll}
                onClick={handleConvertAll}
                className={`btn-3d-primary px-8 py-4 flex items-center justify-center gap-3 ${
                  files.length === 0 ? "opacity-50 cursor-not-allowed shadow-none" : ""
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isConvertingAll ? "spin-3d" : ""}`} />
                <span className="text-base tracking-wide font-black uppercase">
                  {isConvertingAll ? "Transmutation..." : "Convertir"}
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* --- MODAL PARAMÈTRES AVANCÉS 3D --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="window-3d max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 py-3 flex items-center justify-between font-bold text-sm shadow">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Paramètres de Sortie & Moteurs 3D
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="hover:bg-white/20 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qualité d&apos;encodage :</label>
                <select
                  value={options.quality}
                  onChange={(e) => setOptions({ ...options, quality: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800 font-medium"
                >
                  <option value="high">Élevée (CRF 18 / Master Studio)</option>
                  <option value="medium">Moyenne (Recommandé standard web)</option>
                  <option value="low">Compressée (Poids minimal)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Résolution vidéo :</label>
                <select
                  value={options.resolution}
                  onChange={(e) => setOptions({ ...options, resolution: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800 font-medium"
                >
                  <option value="original">Originale (Sans altération)</option>
                  <option value="1080p">Full HD 1080p (1920x1080)</option>
                  <option value="720p">HD 720p (1280x720)</option>
                  <option value="480p">SD 480p (854x480)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Débit binaire Audio (Bitrate) :</label>
                <select
                  value={options.audio_bitrate}
                  onChange={(e) => setOptions({ ...options, audio_bitrate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800 font-medium"
                >
                  <option value="320k">320 kbps (Excellente qualité)</option>
                  <option value="192k">192 kbps (Standard équilibré)</option>
                  <option value="128k">128 kbps (Compact)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={options.ai_translation}
                    onChange={(e) => setOptions({ ...options, ai_translation: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Activer la traduction sémantique IA pour le code (Gemini)</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="btn-3d-primary px-5 py-2 text-xs"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
