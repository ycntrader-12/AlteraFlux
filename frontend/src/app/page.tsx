"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Music,
  FileText,
  Code2,
  Download,
  ChevronDown,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Play,
  Volume2,
  Check,
  ExternalLink
} from "lucide-react";
import {
  fetchPresets,
  requestUploadUrl,
  uploadFileDirect,
  createConversionJob,
  getJobStatus,
  listRecentJobs,
  JobResponse
} from "@/lib/api";

export default function Home() {
  // Fichier sélectionné
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("project_presentation.mp4");
  const [fileSize, setFileSize] = useState<string>("245 MB");
  const [fileType, setFileType] = useState<string>("Video");

  // Sélecteurs de types de fichiers
  const [sourceFilter, setSourceFilter] = useState<string>("Video (*.mp4, *.mov)");
  const [targetCategory, setTargetCategory] = useState<string>("All formats");

  // Format cible & Dropdown
  const [targetFormat, setTargetFormat] = useState<string>("WEBM");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(true);

  // État de conversion & Progression
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(75);
  const [stageText, setStageText] = useState<string>("WEBM (High Quality)...");
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobResponse[]>([]);

  // Onglet actif navbar
  const [activeTab, setActiveTab] = useState<string>("Convert");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Liste des formats du dropdown exactement comme sur l'image
  const formatList = [
    { id: "WEBM", label: "WEBM", category: "video" },
    { id: "AVI", label: "AVI", category: "video" },
    { id: "MOV", label: "MOV", category: "video" },
    { id: "MP3", label: "MP3", category: "audio" },
    { id: "WAV", label: "WAV", category: "audio" },
    { id: "PDF", label: "PDF", category: "document" },
    { id: "DOCX", label: "DOCX", category: "document" },
    { id: "JS", label: "JS (Code)", category: "code" }
  ];

  useEffect(() => {
    loadRecentActivity();
    const interval = setInterval(loadRecentActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRecentActivity = async () => {
    try {
      const jobs = await listRecentJobs();
      setRecentJobs(jobs);
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setFileName(f.name);
      setFileSize(`${(f.size / (1024 * 1024)).toFixed(0)} MB`);

      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) {
        setFileType("Video");
        setTargetFormat("WEBM");
      } else if (["mp3", "wav", "aac", "flac"].includes(ext)) {
        setFileType("Audio");
        setTargetFormat("MP3");
      } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        setFileType("Image");
        setTargetFormat("PDF");
      } else {
        setFileType("Document");
        setTargetFormat("PDF");
      }
    }
  };

  const handleStartConversion = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    setIsConverting(true);
    setProgress(15);
    setStageText(`${targetFormat} (High Quality)...`);

    try {
      const presigned = await requestUploadUrl(selectedFile.name, selectedFile.type, selectedFile.size);
      await uploadFileDirect(presigned.upload_url, selectedFile, presigned.headers);

      const job = await createConversionJob({
        filename: selectedFile.name,
        source_key: presigned.key,
        source_format: selectedFile.name.split(".").pop() || "",
        target_format: targetFormat.toLowerCase(),
        category: fileType.toLowerCase(),
        source_size_bytes: selectedFile.size
      });

      setActiveJob(job);
      listenJob(job.id);
    } catch (err: any) {
      setIsConverting(false);
      alert(err.message || "Erreur de conversion");
    }
  };

  const listenJob = (jobId: string) => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000") + `/ws/jobs/${jobId}`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setActiveJob((prev) => (prev ? { ...prev, ...data } : data));
          if (data.progress !== undefined) {
            setProgress(Math.round(data.progress));
          }
          if (data.stage) {
            setStageText(data.stage);
          }
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            setIsConverting(false);
            loadRecentActivity();
            ws.close();
          }
        } catch {}
      };
      ws.onerror = () => pollJob(jobId);
    } catch {
      pollJob(jobId);
    }
  };

  const pollJob = (jobId: string) => {
    const timer = setInterval(async () => {
      try {
        const j = await getJobStatus(jobId);
        setActiveJob(j);
        setProgress(Math.round(j.progress));
        setStageText(j.stage);
        if (j.status === "COMPLETED" || j.status === "FAILED") {
          setIsConverting(false);
          clearInterval(timer);
          loadRecentActivity();
        }
      } catch {
        clearInterval(timer);
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-8 lg:p-12 items-center justify-center relative">
      {/* Input de fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="w-full max-w-6xl flex flex-col gap-6">
        {/* ==========================================================
            1. BARRE DE NAVIGATION SUPÉRIEURE FLOTTANTE VECTRAMORPH
            ========================================================== */}
        <header className="vectra-nav-glass px-6 py-3.5 flex items-center justify-between shadow-sm">
          {/* Logo VectraMorph avec icône constellation/flèches cyan-violette */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                <circle cx="8" cy="10" r="3" fill="#38bdf8" />
                <circle cx="16" cy="24" r="3" fill="#a855f7" />
                <circle cx="24" cy="12" r="3" fill="#06b6d4" />
                <path d="M8 10L24 12M8 10L16 24M16 24L24 12" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
                <path d="M19 8L25 12L22 17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">
              VectraMorph
            </span>
          </div>

          {/* Onglets de navigation */}
          <nav className="flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab("Convert")}
              className={`relative py-1 transition ${
                activeTab === "Convert" ? "text-cyan-600 font-semibold" : "hover:text-slate-900"
              }`}
            >
              <span>Convert</span>
              {activeTab === "Convert" && (
                <span className="absolute bottom-[-14px] left-0 right-0 h-[3px] bg-cyan-500 rounded-full shadow-[0_2px_8px_rgba(6,182,212,0.6)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("My Files")}
              className={`py-1 transition ${
                activeTab === "My Files" ? "text-cyan-600 font-semibold" : "hover:text-slate-900"
              }`}
            >
              My Files
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("API")}
              className={`py-1 transition ${
                activeTab === "API" ? "text-cyan-600 font-semibold" : "hover:text-slate-900"
              }`}
            >
              API
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Profile")}
              className={`py-1 transition ${
                activeTab === "Profile" ? "text-cyan-600 font-semibold" : "hover:text-slate-900"
              }`}
            >
              Profile
            </button>
          </nav>
        </header>

        {/* ==========================================================
            2. GRILLE PRINCIPALE (CARTE CONVERSION + ACTIVITY FEED)
            ========================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================
              PANNEAU GAUCHE : CARTE PRINCIPALE "CONVERT ANYTHING"
              ======================================================== */}
          <div className="lg:col-span-8 vectra-glass-panel p-6 sm:p-8 flex flex-col gap-6 shadow-lg">
            {/* Titre "Convert Anything to Anything." */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Convert <span className="text-slate-900">Anything to</span> Anything.
              </h1>
            </div>

            {/* Deux sélecteurs en pilules gris clair */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="bg-white/70 hover:bg-white border border-slate-200/80 rounded-lg px-4 py-2 text-xs font-medium text-slate-700 appearance-none pr-8 cursor-pointer shadow-sm focus:outline-none"
                >
                  <option>Select file type</option>
                  <option>Video (*.mp4, *.mov, *.avi)</option>
                  <option>Audio (*.mp3, *.wav, *.flac)</option>
                  <option>Document (*.pdf, *.docx)</option>
                  <option>Code (*.py, *.ts, *.js)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="bg-white/70 hover:bg-white border border-slate-200/80 rounded-lg px-4 py-2 text-xs font-medium text-slate-700 appearance-none pr-8 cursor-pointer shadow-sm focus:outline-none"
                >
                  <option>Select file type</option>
                  <option>All formats</option>
                  <option>High Definition WebM</option>
                  <option>Lossless Audio Master</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* ========================================================
                CARTE INTERNE BLANCHE AVEC FICHIER & DROPDOWN CONVERT TO
                ======================================================== */}
            <div className="vectra-file-card p-5 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Icône & métadonnées du fichier */}
                <div
                  className="flex items-center gap-3.5 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Icône carrée douce avec bordure violette et bouton play */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-100 via-sky-50 to-blue-100 border border-purple-200/60 flex items-center justify-center text-purple-600 shadow-sm relative overflow-hidden group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-800 tracking-tight hover:text-cyan-600 transition">
                      {fileName}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {fileSize} | type: {fileType}
                    </p>
                  </div>
                </div>

                {/* Sélecteur "Convert To" avec Dropdown déplié exactement comme sur la photo */}
                <div className="relative w-full sm:w-36 self-end sm:self-auto">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 text-right sm:text-left">
                    Convert To
                  </div>

                  {/* Bouton du dropdown */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-sky-50/80 hover:bg-sky-100/70 border border-sky-300/80 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800 flex items-center justify-between shadow-sm transition"
                  >
                    <span>{targetFormat}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Menu déroulant ouvert affichant la liste des formats */}
                  {isDropdownOpen && (
                    <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200/90 rounded-md shadow-xl py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                      {formatList.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setTargetFormat(item.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 transition flex items-center justify-between ${
                            targetFormat === item.id
                              ? "bg-sky-50 font-bold text-sky-700"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span>{item.label}</span>
                          {targetFormat === item.id && <Check className="w-3.5 h-3.5 text-sky-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================
                BARRE DE CONVERSION SOMBRE AVEC PROGRESSION NÉON CYAN
                ======================================================== */}
            <div className="vectra-progress-bar-card p-4 text-white relative overflow-hidden">
              {/* Ligne de statut : Converting: 75% | WEBM (High Quality)... */}
              <div className="flex items-center justify-between mb-3 text-xs font-mono">
                <div>
                  <span className="text-slate-300 font-medium">Converting: </span>
                  <span className="text-cyan-400 font-bold">{progress}%</span>
                  <span className="text-slate-400"> | {stageText}</span>
                </div>

                {/* Bouton de conversion / téléchargement */}
                {activeJob?.download_url ? (
                  <a
                    href={activeJob.download_url}
                    download
                    className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={handleStartConversion}
                    className="px-3.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? "animate-spin" : ""}`} />
                    <span>{isConverting ? "Processing..." : "Convert Now"}</span>
                  </button>
                )}
              </div>

              {/* Ligne de progression luminescente cyan-violette */}
              <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative">
                <div
                  className="h-full rounded-full progress-glow-cyan transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Effet d'ondes de circuits en arrière-plan */}
              <div className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none opacity-20 bg-gradient-to-l from-cyan-400 to-transparent" />
            </div>
          </div>

          {/* ========================================================
              PANNEAU DROIT : CARTE BLANCHE "ACTIVITY FEED"
              ======================================================== */}
          <div className="lg:col-span-4 vectra-glass-panel p-6 flex flex-col gap-4 shadow-lg">
            <h2 className="font-bold text-base text-slate-900">
              Activity Feed
            </h2>

            {/* Liste verticale d'activités récentes (exactement comme sur l'image) */}
            <div className="flex flex-col gap-3">
              {/* Item 1 : Haut-parleur bleu */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/80 transition text-xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">soundtrack.wav $\rightarrow$ soundtrack.mp3</p>
                  <p className="text-[11px] text-slate-400">
                    | Completed | <a href="#" className="text-blue-600 hover:underline font-semibold">Download</a>
                  </p>
                </div>
              </div>

              {/* Item 2 : Note de musique rose */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/80 transition text-xs">
                <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 flex-shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">soundtrack.wav $\rightarrow$ soundtrack.mp3</p>
                  <p className="text-[11px] text-slate-400">
                    | Completed | <a href="#" className="text-blue-600 hover:underline font-semibold">Download</a>
                  </p>
                </div>
              </div>

              {/* Item 3 : Haut-parleur violet */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/80 transition text-xs">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">soundtrack.wav $\rightarrow$ soundtrack.mp3</p>
                  <p className="text-[11px] text-slate-400">
                    | Completed | <a href="#" className="text-blue-600 hover:underline font-semibold">Download</a>
                  </p>
                </div>
              </div>

              {/* Item 4 : Haut-parleur indigo */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/80 transition text-xs">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">soundtrack.wav $\rightarrow$ soundtrack.mp3</p>
                  <p className="text-[11px] text-slate-400">
                    | Completed | <a href="#" className="text-blue-600 hover:underline font-semibold">Download</a>
                  </p>
                </div>
              </div>

              {/* Item 5 : Note de musique rose */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/80 transition text-xs">
                <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 flex-shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-slate-800 truncate">soundtrack.wav $\rightarrow$ soundtrack.mp3</p>
                  <p className="text-[11px] text-slate-400">
                    | Completed | <a href="#" className="text-blue-600 hover:underline font-semibold">Download</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Auto-refresh active</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Sync
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
