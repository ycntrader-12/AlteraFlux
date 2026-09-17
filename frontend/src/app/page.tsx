"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  UploadCloud,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  Code,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Shield,
  Cpu,
  Layers,
  Clock,
  ChevronRight,
  Terminal,
  Settings2
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

export default function Home() {
  // --- États généraux ---
  const [presets, setPresets] = useState<PresetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [recentJobs, setRecentJobs] = useState<JobResponse[]>([]);
  const [systemOnline, setSystemOnline] = useState<boolean>(true);

  // --- État du fichier & sélection ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<string>("video");
  const [detectedExt, setDetectedExt] = useState<string>("");
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [conversionOptions, setConversionOptions] = useState<Record<string, any>>({
    quality: "high",
    audio_bitrate: "192k",
    ai_translation: true
  });

  // --- État d'exécution & progression ---
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Chargement des presets et historique au démarrage
  useEffect(() => {
    loadPresetsAndHistory();
    const interval = setInterval(loadHistory, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadPresetsAndHistory = async () => {
    try {
      const data = await fetchPresets();
      setPresets(data);
      setSystemOnline(true);
    } catch {
      setSystemOnline(false);
    }
    await loadHistory();
  };

  const loadHistory = async () => {
    try {
      const jobs = await listRecentJobs();
      setRecentJobs(jobs);
    } catch {
      // Backend potentiellement en cours de démarrage
    }
  };

  // Détection automatique du type de fichier
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMessage("");
    setCurrentJob(null);
    setProgressLog([]);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    setDetectedExt(ext);

    // Détection de catégorie
    let cat = "document";
    if (["mp4", "mkv", "avi", "mov", "webm", "flv"].includes(ext)) cat = "video";
    else if (["mp3", "wav", "aac", "flac", "ogg", "m4a"].includes(ext)) cat = "audio";
    else if (["png", "jpg", "jpeg", "webp", "avif", "gif", "ico", "bmp"].includes(ext)) cat = "image";
    else if (["py", "js", "ts", "jsx", "tsx", "cpp", "rs", "go", "java", "json", "yaml", "yml", "toml"].includes(ext)) cat = "code";

    setDetectedCategory(cat);

    // Trouver un format cible par défaut pertinent
    if (cat === "video") setTargetFormat("mp3");
    else if (cat === "audio") setTargetFormat("wav");
    else if (cat === "image") setTargetFormat("webp");
    else if (cat === "code") setTargetFormat(ext === "py" ? "ts" : (ext === "json" ? "yaml" : "py"));
    else setTargetFormat("pdf");
  };

  // Gestion du Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Établissement du WebSocket temps réel
  const connectJobWebSocket = (jobId: string) => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000") + `/ws/jobs/${jobId}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stage) {
            setProgressLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${data.stage}`]);
          }
          setCurrentJob((prev) => (prev ? { ...prev, ...data } : data));

          if (data.status === "COMPLETED" || data.status === "FAILED") {
            loadHistory();
            ws.close();
          }
        } catch (err) {
          console.error("Erreur parsing WS:", err);
        }
      };

      ws.onerror = () => {
        // Fallback par polling si WebSocket non disponible
        pollJobStatus(jobId);
      };
    } catch {
      pollJobStatus(jobId);
    }
  };

  // Polling de secours
  const pollJobStatus = (jobId: string) => {
    const timer = setInterval(async () => {
      try {
        const job = await getJobStatus(jobId);
        setCurrentJob(job);
        if (job.status === "COMPLETED" || job.status === "FAILED") {
          clearInterval(timer);
          loadHistory();
        }
      } catch {
        clearInterval(timer);
      }
    }, 1000);
  };

  // Lancement du cycle de conversion
  const handleStartConversion = async () => {
    if (!selectedFile || !targetFormat) return;

    setIsUploading(true);
    setErrorMessage("");
    setProgressLog([`[${new Date().toLocaleTimeString()}] Préparation de la requête de téléversement sécurisée...`]);

    try {
      // 1. Demande de Presigned URL à FastAPI
      const presigned = await requestUploadUrl(selectedFile.name, selectedFile.type, selectedFile.size);
      setProgressLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] URL présignée allouée pour la clé ${presigned.key}`]);

      // 2. Upload direct vers S3/MinIO
      setProgressLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Téléversement direct du fichier source...`]);
      await uploadFileDirect(presigned.upload_url, selectedFile, presigned.headers);

      // 3. Création du Job de conversion dans la file
      setProgressLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Fichier téléversé. Envoi de la tâche dans la file Redis...`]);
      const job = await createConversionJob({
        filename: selectedFile.name,
        source_key: presigned.key,
        source_format: detectedExt,
        target_format: targetFormat,
        category: detectedCategory,
        source_size_bytes: selectedFile.size,
        options: conversionOptions
      });

      setCurrentJob(job);
      setIsUploading(false);

      // 4. Connexion au streaming temps réel
      connectJobWebSocket(job.id);
    } catch (err: any) {
      console.error(err);
      setIsUploading(false);
      setErrorMessage(err.message || "Une erreur est survenue pendant l'opération.");
      setProgressLog((prev) => [...prev, `[ERREUR] ${err.message}`]);
    }
  };

  // Formats cibles disponibles pour le fichier courant
  const currentCategoryPresets = presets.find((p) => p.category === detectedCategory);
  const availableTargetFormats = currentCategoryPresets?.target_formats || [
    { id: "mp3", label: "MP3 Audio", description: "Audio universel", popular: true },
    { id: "pdf", label: "PDF Document", description: "Document vectoriel", popular: true },
    { id: "webp", label: "WebP Moderne", description: "Image optimisée", popular: true },
    { id: "ts", label: "TypeScript", description: "Code typé", popular: true }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* --- NAVBAR SUPÉRIEURE --- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080f]/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">AlteraFlux</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Universal Engine v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Architecture Asynchrone Découplée & Multi-Moteurs</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className={`w-2 h-2 rounded-full ${systemOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span>{systemOnline ? "FastAPI & Redis Connectés" : "Mode Standalone Local"}</span>
            </div>

            <a
              href="https://github.com/ycntrader-12/AlteraFlux.git"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* HERO BANNER */}
        <section className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Convertissez Tout. <span className="gradient-text">Sans Limite.</span> En Temps Réel.
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-8">
            Traitement asynchrone découplé pour vidéos, audios, documents riches, images WebP/AVIF et transpilation de code assistée par IA.
          </p>

          {/* BADGES D'INFRASTRUCTURE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-panel p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Upload Direct S3</p>
                <p className="text-sm font-semibold text-slate-200">Presigned URLs</p>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Workers Dédiés</p>
                <p className="text-sm font-semibold text-slate-200">Celery + Redis</p>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Éphéméralité 24h</p>
                <p className="text-sm font-semibold text-slate-200">Purge Automatique</p>
              </div>
            </div>

            <div className="glass-panel p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Moteurs Natifs</p>
                <p className="text-sm font-semibold text-slate-200">FFmpeg, Pandoc, IA</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- ZONE DU CONVERTISSEUR PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SECTION GAUCHE: UPLOAD & FORMAT */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* DROPZONE */}
            <div
              className={`glass-panel p-8 text-center border-2 border-dashed transition-all cursor-pointer relative overflow-hidden ${
                dragActive ? "border-cyan-400 bg-cyan-500/5 glow-cyan" : "border-slate-700/80 hover:border-slate-600"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center mb-4 text-cyan-400">
                <UploadCloud className="w-8 h-8" />
              </div>

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                    <span>{detectedCategory.toUpperCase()}</span>
                    <span>•</span>
                    <span>.{detectedExt.toUpperCase()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white break-all">{selectedFile.name}</h3>
                  <p className="text-xs text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo</p>
                  <p className="text-xs text-cyan-400 underline pt-2">Cliquer pour choisir un autre fichier</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Glissez-déposez votre fichier ici
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Prise en charge universelle : MP4, MP3, DOCX, PDF, PNG, Python, TypeScript, etc.
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition"
                  >
                    Parcourir les fichiers
                  </button>
                </div>
              )}
            </div>

            {/* SÉLECTEUR DE FORMAT CIBLE */}
            {selectedFile && (
              <div className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Format cible recommandé :
                  </label>
                  <span className="text-xs text-slate-400">Catégorie : {detectedCategory}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTargetFormats.map((fmt) => {
                    const isSelected = targetFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setTargetFormat(fmt.id)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          isSelected
                            ? "bg-cyan-500/15 border-cyan-400 text-white glow-cyan"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{fmt.label}</span>
                          {fmt.popular && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Top
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">{fmt.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* BOUTON D'ACTION PRINCIPAL */}
                <button
                  type="button"
                  disabled={isUploading || !targetFormat}
                  onClick={handleStartConversion}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition shadow-xl flex items-center justify-center gap-2 ${
                    isUploading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white hover:opacity-95 shadow-cyan-500/25"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Téléversement et mise en file...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Lancer la conversion ({detectedExt.toUpperCase()} $\rightarrow$ {targetFormat.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* SECTION DROITE: MONITEUR TEMPS RÉEL & TERMINAL */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-panel p-6 flex flex-col h-full">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-200">Moniteur de Traitement Live</span>
                </div>
                {currentJob && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    ID: {currentJob.id.slice(0, 8)}
                  </span>
                )}
              </div>

              {/* CARTE D'ÉTAT D'EXÉCUTION */}
              {currentJob ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        {currentJob.stage}
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-400">
                        {currentJob.progress}%
                      </span>
                    </div>

                    {/* BARRE DE PROGRESSION ANIMÉE */}
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          currentJob.status === "COMPLETED"
                            ? "bg-emerald-400"
                            : currentJob.status === "FAILED"
                            ? "bg-rose-500"
                            : "shimmer-bar"
                        }`}
                        style={{ width: `${currentJob.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* FLUX DE LOGS DU TERMINAL */}
                  <div className="bg-[#03060c] border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-300 h-48 overflow-y-auto space-y-1.5">
                    {progressLog.length === 0 ? (
                      <p className="text-slate-500 italic">En attente des signaux du worker...</p>
                    ) : (
                      progressLog.map((log, idx) => (
                        <p key={idx} className="leading-tight">
                          <span className="text-cyan-400 font-semibold">{`>`}</span> {log}
                        </p>
                      ))
                    )}
                  </div>

                  {/* ACTIONS RÉSULTAT */}
                  {currentJob.status === "COMPLETED" && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Fichier converti avec succès !</span>
                      </div>
                      <a
                        href={currentJob.download_url || "#"}
                        download={currentJob.result_filename || "converted_file"}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger ({currentJob.result_filename})</span>
                      </a>
                    </div>
                  )}

                  {currentJob.status === "FAILED" && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-rose-400 font-semibold text-sm">
                        <AlertCircle className="w-5 h-5" />
                        <span>Échec du traitement</span>
                      </div>
                      <p className="text-xs text-rose-300">{currentJob.error_message || "Erreur interne"}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Cpu className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
                  <p className="text-sm font-medium text-slate-400">Aucune tâche en cours</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Déposez un fichier à gauche pour visualiser la progression du transcodage et les logs d'exécution en direct.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- SECTION HISTORIQUE DES CONVERSIONS RÉCENTES --- */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Historique des Conversions (Éphémère 24h)
              </h2>
              <p className="text-xs text-slate-400">Les fichiers originaux et convertis sont purgés automatiquement après 24 heures.</p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="glass-panel overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune conversion enregistrée pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentJobs.map((job) => (
                  <div key={job.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                        {job.category === "video" && <Video className="w-4 h-4 text-cyan-400" />}
                        {job.category === "audio" && <Music className="w-4 h-4 text-purple-400" />}
                        {job.category === "image" && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                        {job.category === "code" && <Code className="w-4 h-4 text-amber-400" />}
                        {job.category === "document" && <FileText className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{job.filename}</p>
                        <p className="text-xs text-slate-400">
                          {job.source_format.toUpperCase()} $\rightarrow$ {job.target_format.toUpperCase()} • {job.stage}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          job.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : job.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}
                      >
                        {job.status}
                      </span>

                      {job.download_url && (
                        <a
                          href={job.download_url}
                          download={job.result_filename || "download"}
                          className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          await deleteJob(job.id);
                          loadHistory();
                        }}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- PIED DE PAGE --- */}
      <footer className="border-t border-slate-800/80 bg-[#04060b] py-6 px-6 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AlteraFlux. Moteur de conversion universel asynchrone et découplé.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI 0.110+</span>
            <span>•</span>
            <span>Next.js 16</span>
            <span>•</span>
            <span>Celery 5</span>
            <span>•</span>
            <span>FFmpeg</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
