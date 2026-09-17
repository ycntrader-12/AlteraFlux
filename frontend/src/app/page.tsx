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
  X
} from "lucide-react";
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
      const recent = await listRecentJobs();
      if (recent.length > 0 && files.length === 0) {
        // Optionnel : afficher les jobs récents déjà complétés
      }
    } catch {
      // Ignorer si en démarrage
    }
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

  // Lancement de conversion d'un fichier ou de tous
  const startConversionForFile = async (fileItem: QueuedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: "UPLOADING", stage: "Téléversement...", progress: 5 } : f))
    );

    try {
      // 1. Demande d'URL présignée
      const presigned = await requestUploadUrl(fileItem.name, fileItem.file.type, fileItem.size);

      // 2. Upload direct
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, stage: "Envoi direct vers stockage...", progress: 20 } : f))
      );
      await uploadFileDirect(presigned.upload_url, fileItem.file, presigned.headers);

      // 3. Création du Job
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: "PROCESSING", stage: "Traitement en file...", progress: 35 } : f))
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

      // 4. Écoute WebSocket ou Polling
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
    <div className="flex flex-col min-h-screen bg-[#dce4ec] text-[#1e293b] font-sans antialiased select-none">
      {/* --- EN-TÊTE SUPÉRIEUR BLEU PRO STUDIO --- */}
      <header className="bg-[#2b5ec1] text-white shadow-md border-b border-[#214a9b] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Bouton Ajouter Fichier avec Dropdown */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-semibold tracking-wide transition shadow-sm"
            >
              <FilePlus className="w-4 h-4 text-white" />
              <span>Ajouter Fichier</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
          </div>

          {/* Outils secondaires de la barre supérieure */}
          <div className="hidden md:flex items-center gap-1 border-l border-white/20 pl-4">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white/90 transition"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-200" />
              <span>Améliorer la vidéo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white/90 transition"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-200" />
              <span>Couper</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white/90 transition"
            >
              <Box className="w-3.5 h-3.5 text-emerald-200" />
              <span className="bg-white/20 px-1 py-0.2 rounded text-[10px] font-bold">3D</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white/90 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-200" />
              <span>Édition</span>
            </button>
          </div>
        </div>

        {/* Titre / Statut / Aide */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wide">AlteraFlux Studio Pro</span>
          </div>
          <a
            href="https://github.com/ycntrader-12/AlteraFlux.git"
            target="_blank"
            rel="noreferrer"
            className="hover:underline text-white/80 hidden sm:inline"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* --- ZONE PRINCIPALE DE TRAVAIL (2 COLONNES) --- */}
      <div className="flex-1 flex flex-col md:flex-row p-3 gap-3 max-w-[1700px] w-full mx-auto overflow-hidden">
        {/* COLONNE GAUCHE: LISTE DES FICHIERS / MISE EN ROUTE */}
        <div className="flex-1 bg-white border border-[#cbd5e1] rounded shadow-sm flex flex-col overflow-hidden min-h-[440px]">
          {files.length === 0 ? (
            /* --- VUE REPRODUITE MISE EN ROUTE (VIDE) --- */
            <div
              className="flex-1 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-50 transition border-2 border-transparent border-dashed hover:border-blue-300"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="max-w-xl text-left bg-white p-8 rounded-lg">
                <div className="flex items-center gap-2 mb-6">
                  <h1 className="text-2xl font-bold text-slate-800">Mise en route</h1>
                  <span className="px-2 py-0.5 rounded border border-blue-400 text-blue-600 text-xs font-bold">4K</span>
                  <span className="px-2 py-0.5 rounded border border-blue-400 text-blue-600 text-xs font-bold">UHD</span>
                  <span className="px-2 py-0.5 rounded border border-blue-400 text-blue-600 text-xs font-bold">HEVC</span>
                  <span className="px-2 py-0.5 rounded border border-indigo-400 text-indigo-600 text-xs font-bold">IA</span>
                </div>

                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500 w-5">1.</span>
                    <p>
                      Cliquez sur <span className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs text-blue-700"><FilePlus className="w-3 h-3" /> Ajouter Fichier</span> pour importer vos vidéos, audios, documents ou code.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500 w-5">2.</span>
                    <p>
                      Cliquez sur <Wand2 className="w-3.5 h-3.5 inline text-blue-600" /> , <Scissors className="w-3.5 h-3.5 inline text-blue-600" /> , <Box className="w-3.5 h-3.5 inline text-blue-600" /> et <Sliders className="w-3.5 h-3.5 inline text-blue-600" /> pour éditer et configurer vos paramètres.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500 w-5">3.</span>
                    <p>
                      Sélectionnez le format de sortie souhaité à partir de la liste <span className="font-semibold text-slate-900">&quot;Profil&quot;</span> en bas.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500 w-5">4.</span>
                    <p>
                      Cliquez sur le bouton bleu <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 bg-blue-600 text-white rounded text-xs"><RefreshCw className="w-3 h-3" /> Convertir</span> pour lancer la conversion.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
                  Ou glissez-déposez vos fichiers directement ici dans cette fenêtre.
                </div>
              </div>
            </div>
          ) : (
            /* --- VUE LISTE DES FICHIERS IMPORTEURS --- */
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Fichiers à convertir ({files.length})</span>
                <span className="text-slate-400">Cliquez sur un fichier pour l&apos;afficher dans l&apos;aperçu</span>
              </div>

              <div className="divide-y divide-slate-200">
                {files.map((item) => {
                  const isSelected = item.id === selectedFileId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedFileId(item.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? "bg-blue-50/80 border-l-4 border-blue-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded bg-[#e2e8f0] border border-[#cbd5e1] flex items-center justify-center font-bold text-xs uppercase text-slate-600">
                          {item.ext}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-xs text-slate-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {(item.size / (1024 * 1024)).toFixed(2)} Mo • Format cible :{" "}
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
                        {/* Barre de progression si actif */}
                        {item.status === "PROCESSING" && (
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}

                        {item.status === "COMPLETED" && (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Terminé</span>
                          </span>
                        )}

                        {item.status === "FAILED" && (
                          <span className="flex items-center gap-1 text-rose-600 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4" />
                            <span>Erreur</span>
                          </span>
                        )}

                        {/* Sélecteur de format individuel */}
                        <select
                          value={item.targetFormat}
                          onChange={(e) => {
                            e.stopPropagation();
                            const val = e.target.value;
                            setFiles((prev) =>
                              prev.map((f) => (f.id === item.id ? { ...f, targetFormat: val } : f))
                            );
                          }}
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
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
                            className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Télécharger"
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

        {/* COLONNE DROITE: PANNEAU APERÇU (PLAYER STUDIO) */}
        <div className="w-full md:w-[380px] lg:w-[420px] bg-white border border-[#cbd5e1] rounded shadow-sm flex flex-col overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Aperçu</span>
            {selectedItem && <span className="text-[11px] font-normal text-slate-500 truncate max-w-[200px]">{selectedItem.name}</span>}
          </div>

          {/* Écran de lecture noir studio */}
          <div className="relative bg-[#0b1329] aspect-video flex items-center justify-center overflow-hidden">
            {selectedItem?.previewUrl && selectedItem.file.type.startsWith("video") ? (
              <video
                ref={videoRef}
                src={selectedItem.previewUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            ) : selectedItem?.previewUrl && selectedItem.file.type.startsWith("image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.previewUrl} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              /* Écran par défaut style AnyMP4 */
              <div className="text-center p-6 select-none">
                <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                    AF
                  </div>
                </div>
                <h3 className="text-white font-bold text-sm tracking-wider font-mono">ALTERAFLUX</h3>
                <p className="text-[10px] text-blue-300">Lecteur & Transcodeur Universel</p>
              </div>
            )}
          </div>

          {/* Timeline & Durée */}
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

          {/* Barre de contrôle média classique */}
          <div className="bg-[#f1f5f9] px-3 py-2 border-t border-[#cbd5e1] flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Début"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm"
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
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
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
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Avancer 5s"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Outils snapshot & dossier */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alert("Capture instantanée enregistrée dans le dossier d'export.")}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Instantané photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => alert(`Dossier cible : ${destinationPath}`)}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Ouvrir le dossier cible"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>

              {/* Volume */}
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

      {/* --- BARRE INFÉRIEURE : PROFIL, PARAMÈTRES & BOUTON CONVERTIR --- */}
      <footer className="bg-[#eef2f6] border-t border-[#cbd5e1] p-3 shadow-inner">
        <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Bloc des réglages (Lignes 1 & 2) */}
          <div className="flex-1 w-full flex flex-col gap-2 text-xs">
            {/* Ligne Profil */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 w-20">Profil :</span>
              <div className="relative flex-1 max-w-md">
                <select
                  value={globalProfile}
                  onChange={(e) => setGlobalProfile(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded px-3 py-1.5 text-xs text-slate-800 font-medium shadow-sm focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Formats Vidéo">
                    <option value="mp4">MPEG-4 Video (*.mp4) - Standard Universel</option>
                    <option value="webm">WebM Video (*.webm) - Optimisé Web</option>
                    <option value="mkv">MKV Video (*.mkv) - Matroska HD</option>
                    <option value="gif">GIF Animé (*.gif) - Boucle courte</option>
                  </optgroup>
                  <optgroup label="Formats Audio">
                    <option value="mp3">MP3 Audio (*.mp3) - Haute Compatibilité</option>
                    <option value="wav">WAV Audio (*.wav) - Qualité Studio Lossless</option>
                    <option value="flac">FLAC Audio (*.flac) - Sans perte</option>
                  </optgroup>
                  <optgroup label="Formats Image">
                    <option value="webp">WebP Image (*.webp) - Compression W3C</option>
                    <option value="png">PNG Image (*.png) - Avec transparence</option>
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
                className="px-3 py-1.5 rounded bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition"
              >
                Paramètres
              </button>

              <button
                type="button"
                onClick={handleApplyToAll}
                className="px-3 py-1.5 rounded bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition"
              >
                Appliquer à Tous
              </button>
            </div>

            {/* Ligne Destination */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 w-20">Destination :</span>
              <input
                type="text"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
                className="flex-1 max-w-md bg-white border border-[#cbd5e1] rounded px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:outline-none focus:border-blue-500 font-mono"
              />

              <button
                type="button"
                onClick={() => alert("Sélectionnez un nouveau dossier de destination.")}
                className="px-3 py-1.5 rounded bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition"
              >
                Parcourir
              </button>

              <button
                type="button"
                onClick={() => alert(`Dossier ouvert : ${destinationPath}`)}
                className="px-3 py-1.5 rounded bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition"
              >
                Ouvrir le dossier
              </button>

              <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-slate-600">
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

          {/* GROS BOUTON BLEU "CONVERTIR" STYLE STUDIO */}
          <div>
            <button
              type="button"
              disabled={files.length === 0 || isConvertingAll}
              onClick={handleConvertAll}
              className={`px-8 py-4 rounded-md font-bold text-sm text-white flex items-center justify-center gap-2.5 shadow-md transition ${
                files.length === 0
                  ? "bg-slate-400 cursor-not-allowed"
                  : isConvertingAll
                  ? "bg-blue-700 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/30"
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isConvertingAll ? "spin-anim" : ""}`} />
              <span className="text-base tracking-wide">
                {isConvertingAll ? "Conversion en cours..." : "Convertir"}
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* --- MODAL DE PARAMÈTRES AVANCÉS --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-[#2b5ec1] text-white px-4 py-3 flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Paramètres de Sortie & d&apos;Optimisation
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
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="high">Élevée (CRF 18 / Master)</option>
                  <option value="medium">Moyenne (Recommandé standard web)</option>
                  <option value="low">Compressée (Poids minimum)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Résolution vidéo :</label>
                <select
                  value={options.resolution}
                  onChange={(e) => setOptions({ ...options, resolution: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="original">Originale (Conserver)</option>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="320k">320 kbps (Excellente qualité)</option>
                  <option value="192k">192 kbps (Standard équilibré)</option>
                  <option value="128k">128 kbps (Économique)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
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
                className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition"
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
