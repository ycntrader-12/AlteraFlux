"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  ChevronDown,
  RefreshCw,
  Play,
  Check,
  Search,
  Sparkles
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

export interface FormatItem {
  id: string;
  label: string;
  desc: string;
  ext: string;
  badgeColor: string;
}

export interface FormatCategory {
  id: string;
  name: string;
  icon: string;
  formats: FormatItem[];
}

export const FORMAT_CATEGORIES: FormatCategory[] = [
  {
    id: "video",
    name: "Vidéo",
    icon: "🎬",
    formats: [
      { id: "MP4", label: "MP4", desc: "H.264 / AAC Universel", ext: "mp4", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "WEBM", label: "WEBM", desc: "VP9 Web Streaming HD", ext: "webm", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "MKV", label: "MKV", desc: "Matroska Multi-pistes", ext: "mkv", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "MOV", label: "MOV", desc: "Apple QuickTime Pro", ext: "mov", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "AVI", label: "AVI", desc: "Audio Video Interleave", ext: "avi", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "FLV", label: "FLV", desc: "Flash Video Web", ext: "flv", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "WMV", label: "WMV", desc: "Windows Media Video", ext: "wmv", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "GIF", label: "GIF", desc: "Animation Boucle", ext: "gif", badgeColor: "bg-pink-100 text-pink-800" }
    ]
  },
  {
    id: "audio",
    name: "Audio",
    icon: "🎵",
    formats: [
      { id: "MP3", label: "MP3", desc: "MPEG-3 Haute Compatibilité", ext: "mp3", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "WAV", label: "WAV", desc: "Studio Master Lossless PCM", ext: "wav", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "FLAC", label: "FLAC", desc: "Free Lossless Audio Codec", ext: "flac", badgeColor: "bg-violet-100 text-violet-800" },
      { id: "AAC", label: "AAC", desc: "Advanced Audio Coding", ext: "aac", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "OGG", label: "OGG", desc: "Vorbis Open Audio", ext: "ogg", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "M4A", label: "M4A", desc: "Apple Lossless / AAC", ext: "m4a", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "OPUS", label: "OPUS", desc: "Streaming Voix Ultra-HD", ext: "opus", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "WMA", label: "WMA", desc: "Windows Media Audio", ext: "wma", badgeColor: "bg-cyan-100 text-cyan-800" }
    ]
  },
  {
    id: "image",
    name: "Images",
    icon: "🖼️",
    formats: [
      { id: "PNG", label: "PNG", desc: "Transparence Sans Perte", ext: "png", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "JPG", label: "JPG", desc: "JPEG Standard Web & Photo", ext: "jpg", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "WEBP", label: "WEBP", desc: "WebP Ultra-léger Moderne", ext: "webp", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "AVIF", label: "AVIF", desc: "Next-Gen Compression HDR", ext: "avif", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "SVG", label: "SVG", desc: "Vectoriel Scalable XML", ext: "svg", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "ICO", label: "ICO", desc: "Favicon & Icône Windows", ext: "ico", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "BMP", label: "BMP", desc: "Bitmap Non Compressé", ext: "bmp", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "TIFF", label: "TIFF", desc: "Impression & Prépresse HD", ext: "tiff", badgeColor: "bg-pink-100 text-pink-800" }
    ]
  },
  {
    id: "document",
    name: "Documents",
    icon: "📄",
    formats: [
      { id: "PDF", label: "PDF", desc: "Document Vectoriel Universel", ext: "pdf", badgeColor: "bg-red-100 text-red-800" },
      { id: "DOCX", label: "DOCX", desc: "Microsoft Word Éditable", ext: "docx", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "EPUB", label: "EPUB", desc: "Livre Numérique E-reader", ext: "epub", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "TXT", label: "TXT", desc: "Texte Brut UTF-8 Universel", ext: "txt", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "MD", label: "MD", desc: "Markdown GitHub Structuré", ext: "md", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "HTML", label: "HTML", desc: "Page Web Standalone", ext: "html", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "XLSX", label: "XLSX", desc: "Tableur Microsoft Excel", ext: "xlsx", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "CSV", label: "CSV", desc: "Données Tabulaires Export", ext: "csv", badgeColor: "bg-teal-100 text-teal-800" }
    ]
  },
  {
    id: "code",
    name: "Code & Data",
    icon: "💻",
    formats: [
      { id: "TS", label: "TypeScript", desc: "JavaScript Typé (Transpilation)", ext: "ts", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "JS", label: "JavaScript", desc: "ES6+ Web & Node.js", ext: "js", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "PY", label: "Python", desc: "Python 3 Scripting & ML", ext: "py", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "RS", label: "Rust", desc: "Système Sûr & Ultra-rapide", ext: "rs", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "GO", label: "Go", desc: "Golang Microservices & API", ext: "go", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "CPP", label: "C++", desc: "C++ 20 Code Natif Haute Vitesse", ext: "cpp", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "JSON", label: "JSON", desc: "Format d'Échange de Données", ext: "json", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "YAML", label: "YAML", desc: "Configuration YAML Développeur", ext: "yaml", badgeColor: "bg-rose-100 text-rose-800" }
    ]
  }
];

export default function Home() {
  // Fichier sélectionné
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("project_presentation.mp4");
  const [fileSize, setFileSize] = useState<string>("245 MB");
  const [fileType, setFileType] = useState<string>("Video");

  // Sélecteurs de types de fichiers
  const [sourceFilter, setSourceFilter] = useState<string>("Select file type");
  const [targetCategory, setTargetCategory] = useState<string>("Select file type");

  // Format cible & Dropdown par catégories
  const [targetFormat, setTargetFormat] = useState<string>("WEBM");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedFormatCategory, setSelectedFormatCategory] = useState<string>("all");
  const [formatSearch, setFormatSearch] = useState<string>("");

  // État de conversion & Progression
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(75);
  const [stageText, setStageText] = useState<string>("WEBM (High Quality)...");
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobResponse[]>([]);

  // Onglet actif navbar
  const [activeTab, setActiveTab] = useState<string>("Convert");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Total des formats disponibles
  const totalFormatsCount = FORMAT_CATEGORIES.reduce((acc, cat) => acc + cat.formats.length, 0);

  // Catégories et formats filtrés dynamiquement
  const filteredCategories = FORMAT_CATEGORIES.map((cat) => {
    if (selectedFormatCategory !== "all" && cat.id !== selectedFormatCategory) {
      return null;
    }
    const q = formatSearch.trim().toLowerCase();
    const matchedFormats = cat.formats.filter((f) => {
      if (!q) return true;
      return (
        f.id.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        f.ext.toLowerCase().includes(q)
      );
    });
    if (matchedFormats.length === 0) return null;
    return { ...cat, formats: matchedFormats };
  }).filter(Boolean) as FormatCategory[];

  // Trouver la catégorie actuelle du format cible
  const currentCategoryOfTarget = FORMAT_CATEGORIES.find((cat) =>
    cat.formats.some((f) => f.id.toUpperCase() === targetFormat.toUpperCase())
  );

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
      if (["mp4", "mov", "avi", "webm", "mkv", "flv", "wmv"].includes(ext)) {
        setFileType("Video");
        setTargetFormat("WEBM");
        setSelectedFormatCategory("video");
      } else if (["mp3", "wav", "aac", "flac", "ogg", "m4a", "opus"].includes(ext)) {
        setFileType("Audio");
        setTargetFormat("MP3");
        setSelectedFormatCategory("audio");
      } else if (["png", "jpg", "jpeg", "webp", "avif", "svg", "bmp", "tiff", "ico"].includes(ext)) {
        setFileType("Image");
        setTargetFormat("WEBP");
        setSelectedFormatCategory("image");
      } else if (["py", "js", "ts", "rs", "go", "cpp", "c", "json", "yaml", "sql"].includes(ext)) {
        setFileType("Code");
        setTargetFormat("TS");
        setSelectedFormatCategory("code");
      } else {
        setFileType("Document");
        setTargetFormat("PDF");
        setSelectedFormatCategory("document");
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
    <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8 items-center justify-center relative select-none">
      {/* Input de fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="w-full max-w-4xl flex flex-col gap-5">
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
            2. CARTE PRINCIPALE CENTRÉE VECTRAMORPH (AJUSTÉE ET CENTRÉE)
            ========================================================== */}
        {activeTab === "Convert" && (
          <main className="w-full vectra-glass-panel p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
            {/* Entête avec Titre et Sélecteurs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1021]">
                  Convert Anything to Anything.
                </h1>
                <p className="text-xs sm:text-sm text-[#334155] font-semibold mt-1">
                  Moteur de conversion universel ultra-rapide accéléré par AlteraFlux
                </p>
              </div>

              {/* Deux sélecteurs en pilules 3D : haute lisibilité */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="selector-3d rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] appearance-none pr-9 cursor-pointer focus:outline-none"
                  >
                    <option value="Select file type">Tous les types sources</option>
                    <option value="video">🎬 Vidéo (*.mp4, *.webm, *.mov, *.avi)</option>
                    <option value="audio">🎵 Audio (*.mp3, *.wav, *.flac, *.aac)</option>
                    <option value="image">🖼️ Images (*.png, *.jpg, *.webp, *.avif)</option>
                    <option value="document">📄 Documents (*.pdf, *.docx, *.epub, *.md)</option>
                    <option value="code">💻 Code (*.ts, *.py, *.js, *.rs, *.go)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={selectedFormatCategory}
                    onChange={(e) => {
                      setSelectedFormatCategory(e.target.value);
                      setTargetCategory(e.target.value);
                    }}
                    className="selector-3d rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] appearance-none pr-9 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Toutes les catégories (40+ formats)</option>
                    <option value="video">🎬 Vidéo (8 formats)</option>
                    <option value="audio">🎵 Audio (8 formats)</option>
                    <option value="image">🖼️ Images (8 formats)</option>
                    <option value="document">📄 Documents (8 formats)</option>
                    <option value="code">💻 Code & Data (8 formats)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#0F172A] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Carte interne blanche surélevée */}
            <div className="vectra-file-card p-6 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                {/* Métadonnées du fichier */}
                <div
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Icône violette carrée avec bouton play 3D */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-100 via-sky-50 to-blue-100 border border-purple-200/80 flex items-center justify-center text-purple-600 shadow-md relative overflow-hidden group-hover:scale-105 transition">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-[#0B1021] tracking-tight group-hover:text-[#0284C7] transition">
                      {fileName}
                    </h3>
                    <p className="text-xs text-[#334155] font-semibold mt-0.5">
                      {fileSize} • type: {fileType} • <span className="text-[#0284C7] underline font-bold">Changer de fichier</span>
                    </p>
                  </div>
                </div>

                {/* Sélecteur "Convert To" avec bouton 3D tactile & Menu déroulant par catégorie */}
                <div className="relative w-full sm:w-56 self-end sm:self-auto">
                  <div className="text-[12px] font-extrabold text-[#0F172A] mb-1.5 text-right sm:text-left flex items-center justify-between">
                    <span>Convert To</span>
                    {currentCategoryOfTarget && (
                      <span className="text-[10px] text-[#0284C7] font-bold">
                        {currentCategoryOfTarget.icon} {currentCategoryOfTarget.name}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full selector-3d rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#0284C7] font-black text-sm tracking-wide">{targetFormat}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                        {currentCategoryOfTarget ? currentCategoryOfTarget.name : "Format"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#0F172A] transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Menu déroulant ouvert par Catégories */}
                  {isDropdownOpen && (
                    <div className="absolute z-40 top-full mt-2 right-0 w-80 sm:w-96 bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl shadow-2xl p-3 text-xs text-[#0F172A] animate-in fade-in zoom-in-95 duration-150">
                      {/* 1. Barre de recherche rapide */}
                      <div className="relative mb-2.5">
                        <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={formatSearch}
                          onChange={(e) => setFormatSearch(e.target.value)}
                          placeholder="Rechercher (ex: mp4, webp, pdf, ts...)"
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#00D4FF] text-[#0F172A] font-semibold"
                        />
                      </div>

                      {/* 2. Onglets de Catégories (Pillules 3D) */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-[#E2E8F0] scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setSelectedFormatCategory("all")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                            selectedFormatCategory === "all"
                              ? "bg-[#080C27] text-white shadow-sm"
                              : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                          }`}
                        >
                          Tous ({totalFormatsCount})
                        </button>
                        {FORMAT_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedFormatCategory(cat.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                              selectedFormatCategory === cat.id
                                ? "bg-[#00E5FF] text-[#080C27] shadow-sm font-extrabold"
                                : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* 3. Liste des formats groupés par catégorie avec défilement */}
                      <div className="max-h-52 overflow-y-auto flex flex-col gap-2.5 pr-1">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((cat) => (
                            <div key={cat.id} className="flex flex-col gap-1">
                              {/* Header de catégorie */}
                              <div className="flex items-center justify-between px-2.5 py-1 bg-slate-100/90 rounded-md text-[10px] font-extrabold text-[#334155] uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <span>{cat.icon}</span>
                                  <span>{cat.name}</span>
                                </span>
                                <span className="text-[#64748B] font-bold">{cat.formats.length} formats</span>
                              </div>

                              {/* Formats de la catégorie */}
                              <div className="grid grid-cols-1 gap-1">
                                {cat.formats.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setTargetFormat(item.id);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
                                      targetFormat === item.id
                                        ? "bg-sky-100 border border-sky-300 text-[#0284c7] font-extrabold"
                                        : "hover:bg-slate-100 text-[#0F172A] font-semibold"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${item.badgeColor}`}>
                                        {item.id}
                                      </span>
                                      <div>
                                        <p className="text-xs font-bold leading-none">{item.label}</p>
                                        <p className="text-[10px] text-[#64748B] font-medium mt-0.5">{item.desc}</p>
                                      </div>
                                    </div>
                                    {targetFormat === item.id && (
                                      <Check className="w-4 h-4 text-[#0284c7] flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-[#64748B]">
                            <p className="font-bold text-xs">Aucun format trouvé</p>
                            <p className="text-[10px] mt-0.5">Essayez un autre terme de recherche.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Carte de progression sombre #080C27 avec barre cyan et bouton 3D */}
            <div className="vectra-progress-card p-5 sm:p-6 text-[#F8FAFC] relative overflow-hidden">
              {/* Ligne de statut */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 text-xs sm:text-sm font-mono">
                <div>
                  <span className="text-[#FFFFFF] font-bold">Converting: </span>
                  <span className="text-[#00E5FF] font-black text-base">{progress}%</span>
                  <span className="text-[#94A3B8] font-medium"> | {stageText}</span>
                </div>

                {activeJob?.download_url ? (
                  <a
                    href={activeJob.download_url}
                    download
                    className="btn-3d-cyan !py-2 !px-5 text-xs sm:text-sm font-extrabold shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={handleStartConversion}
                    className="btn-3d-cyan !py-2 !px-5 text-xs sm:text-sm font-extrabold shadow-lg"
                  >
                    <RefreshCw className={`w-4 h-4 ${isConverting ? "animate-spin" : ""}`} />
                    <span>{isConverting ? "Processing..." : "Convert Now"}</span>
                  </button>
                )}
              </div>

              {/* Barre de progression cyan : #00D4FF avec lueur néon */}
              <div className="w-full h-3 rounded-full bg-[#030614] overflow-hidden relative border border-cyan-900/40">
                <div
                  className="h-full rounded-full vectra-progress-cyan transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Effet visuel circuit en dégradé */}
              <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-20 bg-gradient-to-l from-[#00D4FF] to-transparent" />
            </div>

            {/* Bandeau inférieur de spécifications et sécurité */}
            <div className="flex flex-wrap items-center justify-between pt-3 text-xs text-[#475569] font-semibold border-t border-[#E2E8F0]">
              <div className="flex items-center gap-3 sm:gap-6">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  Moteur haute performance
                </span>
                <span>•</span>
                <span>Qualité Lossless HD</span>
                <span>•</span>
                <span>Chiffrement AES-256</span>
              </div>
              <span className="text-[#0284C7] font-bold">AlteraFlux v1.0</span>
            </div>
          </main>
        )}

        {/* Onglet My Files */}
        {activeTab === "My Files" && (
          <main className="w-full vectra-glass-panel p-6 sm:p-10 flex flex-col gap-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1021]">
                  My Converted Files
                </h1>
                <p className="text-xs sm:text-sm text-[#334155] font-semibold mt-1">
                  Historique de vos conversions récentes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("Convert")}
                className="btn-3d-cyan text-xs !py-2 !px-4"
              >
                + Convert New File
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="vectra-file-card p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-100 to-blue-200 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Play className="w-4 h-4 fill-blue-700" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#0B1021]">{job.filename}</h4>
                        <p className="text-xs text-[#475569] font-medium">
                          {job.source_format.toUpperCase()} → {job.target_format.toUpperCase()} • Statut: {job.status}
                        </p>
                      </div>
                    </div>

                    {job.download_url && (
                      <a href={job.download_url} download className="btn-3d-blue">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[#475569]">
                  <p className="font-bold text-base text-[#0B1021]">Aucun fichier récent pour le moment</p>
                  <p className="text-xs mt-1">Lancez une conversion pour voir vos fichiers ici.</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Onglet API */}
        {activeTab === "API" && (
          <main className="w-full vectra-glass-panel p-6 sm:p-10 flex flex-col gap-6 shadow-2xl">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1021]">
                API & Developer Access
              </h1>
              <p className="text-xs sm:text-sm text-[#334155] font-semibold mt-1">
                Intégrez le moteur de conversion AlteraFlux dans vos applications
              </p>
            </div>

            <div className="vectra-progress-card p-5 text-[#F8FAFC] font-mono text-xs overflow-x-auto">
              <p className="text-[#00E5FF] font-bold mb-2">// Exemple de requête cURL</p>
              <code>curl -X POST http://localhost:8000/api/v1/conversions -H &quot;Content-Type: application/json&quot; -d &apos;&#123;&quot;filename&quot;: &quot;demo.mp4&quot;, &quot;target_format&quot;: &quot;webm&quot;&#125;&apos;</code>
            </div>

            <div className="flex justify-end">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="btn-3d-cyan text-xs !py-2 !px-4"
              >
                Ouvrir Swagger API Docs →
              </a>
            </div>
          </main>
        )}

        {/* Onglet Profile */}
        {activeTab === "Profile" && (
          <main className="w-full vectra-glass-panel p-6 sm:p-10 flex flex-col gap-6 shadow-2xl">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1021]">
                User Profile & Tier
              </h1>
              <p className="text-xs sm:text-sm text-[#334155] font-semibold mt-1">
                Paramètres de compte et quotas de traitement
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="vectra-file-card p-4">
                <p className="text-xs text-[#475569] font-bold">Plan Actuel</p>
                <p className="text-lg font-black text-[#0B1021] mt-1">Pro Unlimited</p>
              </div>
              <div className="vectra-file-card p-4">
                <p className="text-xs text-[#475569] font-bold">Vitesse de Traitement</p>
                <p className="text-lg font-black text-[#00A3BD] mt-1">Hardware GPU Ultra</p>
              </div>
              <div className="vectra-file-card p-4">
                <p className="text-xs text-[#475569] font-bold">Stockage Cloud</p>
                <p className="text-lg font-black text-[#0B1021] mt-1">Éphémère 24h</p>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
