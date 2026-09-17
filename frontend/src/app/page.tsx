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
  Play,
  Volume2,
  Check
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
  const [sourceFilter, setSourceFilter] = useState<string>("Select file type");
  const [targetCategory, setTargetCategory] = useState<string>("Select file type");

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
    { id: "WEBM", label: "WEBM" },
    { id: "AVI", label: "AVI" },
    { id: "MOV", label: "MOV" },
    { id: "MP3", label: "MP3" },
    { id: "WAV", label: "WAV" },
    { id: "PDF", label: "PDF" },
    { id: "DOCX", label: "DOCX" },
    { id: "JS", label: "JS (Code)" }
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
    <div className="flex flex-col min-h-screen p-4 sm:p-8 lg:p-12 items-center justify-center relative select-none">
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
          {/* Logo VectraMorph avec constellation cyan/violet */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                <circle cx="8" cy="10" r="3" fill="#00E5FF" />
                <circle cx="16" cy="24" r="3" fill="#8CB4F8" />
                <circle cx="24" cy="12" r="3" fill="#00D4FF" />
                <path d="M8 10L24 12M8 10L16 24M16 24L24 12" stroke="#8CB4F8" strokeWidth="2" strokeLinecap="round" />
                <path d="M19 8L25 12L22 17" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-[#111827]">
              VectraMorph
            </span>
          </div>

          {/* Onglets de navigation 3D aux couleurs de l'application */}
          <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("Convert")}
              className={activeTab === "Convert" ? "btn-3d-cyan" : "btn-3d-glass"}
            >
              <span>Convert</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("My Files")}
              className={activeTab === "My Files" ? "btn-3d-cyan" : "btn-3d-glass"}
            >
              <span>My Files</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("API")}
              className={activeTab === "API" ? "btn-3d-cyan" : "btn-3d-glass"}
            >
              <span>API</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Profile")}
              className={activeTab === "Profile" ? "btn-3d-cyan" : "btn-3d-glass"}
            >
              <span>Profile</span>
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
          <div className="lg:col-span-8 vectra-glass-panel p-6 sm:p-8 flex flex-col gap-6">
            {/* Titre "Convert Anything to Anything." : #0B1021 avec lisibilité maximale */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1021]">
                Convert Anything to Anything.
              </h1>
            </div>

            {/* Deux sélecteurs en pilules 3D : haute lisibilité */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="selector-3d rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] appearance-none pr-9 cursor-pointer focus:outline-none"
                >
                  <option>Select file type</option>
                  <option>Video (*.mp4, *.mov, *.avi)</option>
                  <option>Audio (*.mp3, *.wav, *.flac)</option>
                  <option>Document (*.pdf, *.docx)</option>
                  <option>Code (*.py, *.ts, *.js)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3 top-3 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="selector-3d rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] appearance-none pr-9 cursor-pointer focus:outline-none"
                >
                  <option>Select file type</option>
                  <option>All formats</option>
                  <option>WebM Video HD</option>
                  <option>Lossless Audio Master</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* ========================================================
                CARTE INTERNE BLANCHE (#FFFFFF) AVEC FICHIER & DROPDOWN
                ======================================================== */}
            <div className="vectra-file-card p-5 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Métadonnées du fichier */}
                <div
                  className="flex items-center gap-3.5 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Icône violette carrée avec bouton play 3D */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-100 via-sky-50 to-blue-100 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-md relative overflow-hidden group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#0B1021] tracking-tight hover:text-[#00D4FF] transition">
                      {fileName}
                    </h3>
                    <p className="text-xs text-[#334155] font-semibold mt-0.5">
                      {fileSize} • type: {fileType}
                    </p>
                  </div>
                </div>

                {/* Sélecteur "Convert To" avec bouton 3D tactile */}
                <div className="relative w-full sm:w-40 self-end sm:self-auto">
                  <div className="text-[12px] font-extrabold text-[#0F172A] mb-1.5 text-right sm:text-left">
                    Convert To
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full selector-3d rounded-xl px-3.5 py-2 text-xs font-bold text-[#0F172A] flex items-center justify-between transition"
                  >
                    <span className="text-[#0284C7] font-extrabold">{targetFormat}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#0F172A] transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Menu déroulant ouvert avec élévation 3D */}
                  {isDropdownOpen && (
                    <div className="absolute z-30 top-full mt-2 w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl shadow-2xl py-1.5 text-xs font-bold text-[#0F172A] animate-in fade-in zoom-in-95 duration-100">
                      {formatList.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setTargetFormat(item.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 transition flex items-center justify-between ${
                            targetFormat === item.id
                              ? "bg-sky-100 text-[#0284c7] font-extrabold"
                              : "hover:bg-slate-100 text-[#0F172A] font-bold"
                          }`}
                        >
                          <span>{item.label}</span>
                          {targetFormat === item.id && <Check className="w-4 h-4 text-[#0284c7]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================
                CARTE DE PROGRESSION SOMBRE : #080C27
                BARRE CYAN : #00D4FF | BOUTON 3D VIBRANT
                ======================================================== */}
            <div className="vectra-progress-card p-4 text-[#F8FAFC] relative overflow-hidden">
              {/* Ligne de statut : Converting: 75% | WEBM (High Quality)... */}
              <div className="flex items-center justify-between mb-3 text-xs font-mono">
                <div>
                  <span className="text-[#FFFFFF] font-bold">Converting: </span>
                  <span className="text-[#00E5FF] font-black text-sm">{progress}%</span>
                  <span className="text-[#94A3B8] font-medium"> | {stageText}</span>
                </div>

                {activeJob?.download_url ? (
                  <a
                    href={activeJob.download_url}
                    download
                    className="btn-3d-cyan !py-1.5 !px-4 text-xs font-extrabold shadow-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={handleStartConversion}
                    className="btn-3d-cyan !py-1.5 !px-4 text-xs font-extrabold shadow-lg"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? "animate-spin" : ""}`} />
                    <span>{isConverting ? "Processing..." : "Convert Now"}</span>
                  </button>
                )}
              </div>

              {/* Barre de progression cyan : #00D4FF */}
              <div className="w-full h-2.5 rounded-full bg-[#030614] overflow-hidden relative border border-cyan-900/40">
                <div
                  className="h-full rounded-full vectra-progress-cyan transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Effet visuel circuit en dégradé */}
              <div className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none opacity-20 bg-gradient-to-l from-[#00D4FF] to-transparent" />
            </div>
          </div>

          {/* ========================================================
              PANNEAU DROIT : CARTE BLANCHE "ACTIVITY FEED"
              LIENS BLEUS : #3B82F6
              ======================================================== */}
          <div className="lg:col-span-4 vectra-glass-panel p-6 flex flex-col gap-4">
            <h2 className="font-extrabold text-lg text-[#0B1021] tracking-tight">
              Activity Feed
            </h2>

            {/* Liste d'activités avec icônes colorées et boutons 3D */}
            <div className="flex flex-col gap-3">
              {/* Item 1 */}
              <div className="p-2.5 rounded-xl hover:bg-slate-50/80 transition text-xs border border-transparent hover:border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0 shadow-sm">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0F172A] truncate">soundtrack.wav → soundtrack.mp3</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#334155] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      Completed
                    </span>
                    <a href="#" className="btn-3d-blue">Download</a>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-2.5 rounded-xl hover:bg-slate-50/80 transition text-xs border border-transparent hover:border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700 flex-shrink-0 shadow-sm">
                  <Music className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0F172A] truncate">interview_take1.flac → interview.mp3</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#334155] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      Completed
                    </span>
                    <a href="#" className="btn-3d-blue">Download</a>
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-2.5 rounded-xl hover:bg-slate-50/80 transition text-xs border border-transparent hover:border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0 shadow-sm">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0F172A] truncate">ambient_drone.wav → ambient.mp3</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#334155] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      Completed
                    </span>
                    <a href="#" className="btn-3d-blue">Download</a>
                  </div>
                </div>
              </div>

              {/* Item 4 */}
              <div className="p-2.5 rounded-xl hover:bg-slate-50/80 transition text-xs border border-transparent hover:border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0 shadow-sm">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0F172A] truncate">promo_video.mov → promo.webm</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#334155] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      Completed
                    </span>
                    <a href="#" className="btn-3d-blue">Download</a>
                  </div>
                </div>
              </div>

              {/* Item 5 */}
              <div className="p-2.5 rounded-xl hover:bg-slate-50/80 transition text-xs border border-transparent hover:border-[#E2E8F0] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700 flex-shrink-0 shadow-sm">
                  <Music className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0F172A] truncate">bassline_loop.wav → bassline.mp3</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#334155] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      Completed
                    </span>
                    <a href="#" className="btn-3d-blue">Download</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#4B5563]">
              <span>Auto-sync active</span>
              <span className="text-[#00D4FF] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-ping" />
                Live Feed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
