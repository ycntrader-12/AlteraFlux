"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  ChevronDown,
  RefreshCw,
  Play,
  Check,
  Search,
  Sparkles,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  Clock
} from "lucide-react";
import {
  fetchPresets,
  requestUploadUrl,
  uploadFileDirect,
  createConversionJob,
  getJobStatus,
  listRecentJobs,
  deleteJob,
  getDownloadUrl,
  fetchCooldown,
  JobResponse
} from "@/lib/api";

interface FormatItem {
  id: string;
  label: string;
  desc: string;
  ext: string;
  badgeColor: string;
}

interface FormatCategory {
  id: string;
  name: string;
  icon: string;
  formats: FormatItem[];
}

const FORMAT_CATEGORIES: FormatCategory[] = [
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
    name: "Documents texte",
    icon: "📄",
    formats: [
      { id: "DOCX", label: "DOCX", desc: "Microsoft Word", ext: "docx", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "DOC", label: "DOC", desc: "Microsoft Word ancien format", ext: "doc", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "DOCM", label: "DOCM", desc: "Word avec macros", ext: "docm", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "DOT", label: "DOT", desc: "Modèle Word", ext: "dot", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "DOTX", label: "DOTX", desc: "Modèle Word XML", ext: "dotx", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "DOTM", label: "DOTM", desc: "Modèle Word avec macros", ext: "dotm", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "ODT", label: "ODT", desc: "OpenDocument Text", ext: "odt", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "OTT", label: "OTT", desc: "Modèle OpenDocument", ext: "ott", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "RTF", label: "RTF", desc: "Rich Text Format", ext: "rtf", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "TXT", label: "TXT", desc: "Texte brut UTF-8", ext: "txt", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "MD", label: "MD", desc: "Markdown structuré", ext: "md", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "TEX", label: "TEX", desc: "LaTeX composition", ext: "tex", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "LATEX", label: "LATEX", desc: "Document LaTeX", ext: "latex", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "XML", label: "XML", desc: "XML Markup Language", ext: "xml", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "HTML", label: "HTML", desc: "Page web HTML5", ext: "html", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "HTM", label: "HTM", desc: "Fichier HTML", ext: "htm", badgeColor: "bg-rose-100 text-rose-800" }
    ]
  },
  {
    id: "pdf",
    name: "PDF & Associés",
    icon: "📕",
    formats: [
      { id: "PDF", label: "PDF", desc: "Portable Document Format", ext: "pdf", badgeColor: "bg-red-100 text-red-800" },
      { id: "PDFA", label: "PDF/A", desc: "PDF/A Archivage pérenne", ext: "pdfa", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "XPS", label: "XPS", desc: "XML Paper Specification", ext: "xps", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "OXPS", label: "OXPS", desc: "OpenXPS Document", ext: "oxps", badgeColor: "bg-sky-100 text-sky-800" }
    ]
  },
  {
    id: "spreadsheet",
    name: "Feuilles de calcul",
    icon: "📊",
    formats: [
      { id: "XLSX", label: "XLSX", desc: "Excel Moderne", ext: "xlsx", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "XLS", label: "XLS", desc: "Excel ancien format", ext: "xls", badgeColor: "bg-green-100 text-green-800" },
      { id: "XLSM", label: "XLSM", desc: "Excel avec macros", ext: "xlsm", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "XLSB", label: "XLSB", desc: "Excel Binary Workbook", ext: "xlsb", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "XLT", label: "XLT", desc: "Modèle Excel", ext: "xlt", badgeColor: "bg-green-100 text-green-800" },
      { id: "XLTX", label: "XLTX", desc: "Modèle Excel XML", ext: "xltx", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "XLTM", label: "XLTM", desc: "Modèle Excel avec macros", ext: "xltm", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "ODS", label: "ODS", desc: "OpenDocument Spreadsheet", ext: "ods", badgeColor: "bg-lime-100 text-lime-800" },
      { id: "OTS", label: "OTS", desc: "Modèle OpenDocument Spreadsheet", ext: "ots", badgeColor: "bg-lime-100 text-lime-800" },
      { id: "CSV", label: "CSV", desc: "Valeurs séparées par virgules", ext: "csv", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "TSV", label: "TSV", desc: "Valeurs séparées par tabulations", ext: "tsv", badgeColor: "bg-sky-100 text-sky-800" }
    ]
  },
  {
    id: "presentation",
    name: "Présentations",
    icon: "📽️",
    formats: [
      { id: "PPTX", label: "PPTX", desc: "PowerPoint", ext: "pptx", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "PPT", label: "PPT", desc: "PowerPoint ancien format", ext: "ppt", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "PPTM", label: "PPTM", desc: "PowerPoint avec macros", ext: "pptm", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "PPS", label: "PPS", desc: "PowerPoint Show", ext: "pps", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "PPSX", label: "PPSX", desc: "PowerPoint Show Moderne", ext: "ppsx", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "PPSM", label: "PPSM", desc: "PowerPoint Show avec macros", ext: "ppsm", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "POT", label: "POT", desc: "Modèle PowerPoint", ext: "pot", badgeColor: "bg-yellow-100 text-yellow-800" },
      { id: "POTX", label: "POTX", desc: "Modèle PowerPoint XML", ext: "potx", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "POTM", label: "POTM", desc: "Modèle PowerPoint avec macros", ext: "potm", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "ODP", label: "ODP", desc: "OpenDocument Presentation", ext: "odp", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "OTP", label: "OTP", desc: "Modèle OpenDocument Presentation", ext: "otp", badgeColor: "bg-purple-100 text-purple-800" }
    ]
  },
  {
    id: "database",
    name: "Bases de données & Données",
    icon: "🗃️",
    formats: [
      { id: "MDB", label: "MDB", desc: "Microsoft Access Ancien", ext: "mdb", badgeColor: "bg-red-100 text-red-800" },
      { id: "ACCDB", label: "ACCDB", desc: "Microsoft Access Moderne", ext: "accdb", badgeColor: "bg-red-100 text-red-800" },
      { id: "DB", label: "DB", desc: "Base de données", ext: "db", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "SQLITE", label: "SQLITE", desc: "SQLite", ext: "sqlite", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "SQLITE3", label: "SQLITE3", desc: "SQLite version 3", ext: "sqlite3", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "JSON", label: "JSON", desc: "JSON Structuré", ext: "json", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "YAML", label: "YAML", desc: "YAML", ext: "yaml", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "YML", label: "YML", desc: "YAML", ext: "yml", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "CSV", label: "CSV", desc: "Données tabulaires", ext: "csv", badgeColor: "bg-teal-100 text-teal-800" }
    ]
  },
  {
    id: "ebook",
    name: "Formats e-Book",
    icon: "📝",
    formats: [
      { id: "EPUB", label: "EPUB", desc: "eBook", ext: "epub", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "MOBI", label: "MOBI", desc: "Mobipocket", ext: "mobi", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "AZW", label: "AZW", desc: "Amazon Kindle", ext: "azw", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "AZW3", label: "AZW3", desc: "Amazon Kindle 8", ext: "azw3", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "FB2", label: "FB2", desc: "FictionBook", ext: "fb2", badgeColor: "bg-indigo-100 text-indigo-800" },
      { id: "CBZ", label: "CBZ", desc: "Comic Book ZIP", ext: "cbz", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "CBR", label: "CBR", desc: "Comic Book RAR", ext: "cbr", badgeColor: "bg-pink-100 text-pink-800" }
    ]
  },
  {
    id: "publishing",
    name: "Impression & Publication",
    icon: "🖨️",
    formats: [
      { id: "PS", label: "PS", desc: "PostScript", ext: "ps", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "EPS", label: "EPS", desc: "Encapsulated PostScript", ext: "eps", badgeColor: "bg-violet-100 text-violet-800" },
      { id: "PUB", label: "PUB", desc: "Microsoft Publisher", ext: "pub", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "PMD", label: "PMD", desc: "PageMaker", ext: "pmd", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "INDD", label: "INDD", desc: "Adobe InDesign", ext: "indd", badgeColor: "bg-pink-100 text-pink-800" },
      { id: "IDML", label: "IDML", desc: "InDesign Markup Language", ext: "idml", badgeColor: "bg-rose-100 text-rose-800" }
    ]
  },
  {
    id: "technical",
    name: "Documents techniques",
    icon: "📐",
    formats: [
      { id: "DWG", label: "DWG", desc: "AutoCAD", ext: "dwg", badgeColor: "bg-red-100 text-red-800" },
      { id: "DXF", label: "DXF", desc: "Drawing Exchange Format", ext: "dxf", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "DGN", label: "DGN", desc: "MicroStation", ext: "dgn", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "SVG", label: "SVG", desc: "Scalable Vector Graphics", ext: "svg", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "VSD", label: "VSD", desc: "Visio", ext: "vsd", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "VSDX", label: "VSDX", desc: "Visio", ext: "vsdx", badgeColor: "bg-sky-100 text-sky-800" },
      { id: "VSDM", label: "VSDM", desc: "Visio avec macros", ext: "vsdm", badgeColor: "bg-indigo-100 text-indigo-800" }
    ]
  },
  {
    id: "notes",
    name: "Formats de notes",
    icon: "✍️",
    formats: [
      { id: "ONE", label: "ONE", desc: "Microsoft OneNote", ext: "one", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "ENEX", label: "ENEX", desc: "Evernote Export", ext: "enex", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "OPML", label: "OPML", desc: "Outline Processor Markup Language", ext: "opml", badgeColor: "bg-sky-100 text-sky-800" }
    ]
  },
  {
    id: "code",
    name: "Code & Transpilation",
    icon: "💻",
    formats: [
      { id: "TS", label: "TypeScript", desc: "JavaScript Typé (Transpilation)", ext: "ts", badgeColor: "bg-blue-100 text-blue-800" },
      { id: "JS", label: "JavaScript", desc: "ES6+ Web & Node.js", ext: "js", badgeColor: "bg-amber-100 text-amber-800" },
      { id: "PY", label: "Python", desc: "Python 3 Scripting & ML", ext: "py", badgeColor: "bg-emerald-100 text-emerald-800" },
      { id: "RS", label: "Rust", desc: "Système Sûr & Ultra-rapide", ext: "rs", badgeColor: "bg-orange-100 text-orange-800" },
      { id: "GO", label: "Go", desc: "Golang Microservices & API", ext: "go", badgeColor: "bg-cyan-100 text-cyan-800" },
      { id: "CPP", label: "C++", desc: "C++ 20 Code Natif Haute Vitesse", ext: "cpp", badgeColor: "bg-purple-100 text-purple-800" },
      { id: "C", label: "C", desc: "Langage C ANSI / C11", ext: "c", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "SQL", label: "SQL", desc: "Schémas & Requêtes", ext: "sql", badgeColor: "bg-teal-100 text-teal-800" },
      { id: "JSON", label: "JSON", desc: "Format d'Échange de Données", ext: "json", badgeColor: "bg-slate-100 text-slate-800" },
      { id: "YAML", label: "YAML", desc: "Configuration YAML", ext: "yaml", badgeColor: "bg-rose-100 text-rose-800" },
      { id: "TOML", label: "TOML", desc: "Format de Configuration Moderne", ext: "toml", badgeColor: "bg-amber-100 text-amber-800" }
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
  const [myFilesCategory, setMyFilesCategory] = useState<string>("all");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Délai d'attente public : 5 minutes (300 secondes) entre chaque conversion
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Gestionnaires d'actions par lot (Select All, Batch Delete, Batch Download)
  const handleToggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleToggleSelectAll = (visibleJobs: JobResponse[]) => {
    const visibleIds = visibleJobs.map((j) => j.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedJobIds.includes(id));
    if (allSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedJobIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBatchDownload = (jobsToDownload: JobResponse[]) => {
    const completedJobs = jobsToDownload.filter((j) => j.status === "COMPLETED");
    if (completedJobs.length === 0) {
      setDialog({
        isOpen: true,
        type: "info",
        title: "Aucun fichier à télécharger",
        message: "Aucun fichier prêt pour le téléchargement n'est sélectionné.",
        confirmText: "Compris"
      });
      return;
    }

    completedJobs.forEach((job, index) => {
      setTimeout(() => {
        const url = getDownloadUrl(job);
        const a = document.createElement("a");
        a.href = url;
        a.download = job.result_filename || job.filename;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 350);
    });
  };

  const handleBatchDelete = (jobIdsToDelete: string[]) => {
    if (jobIdsToDelete.length === 0) return;
    setDialog({
      isOpen: true,
      type: "warning",
      title: `Supprimer les ${jobIdsToDelete.length} fichier(s) ?`,
      message: `Voulez-vous vraiment supprimer les ${jobIdsToDelete.length} conversion(s) sélectionnée(s) de votre historique et effacer leurs fichiers ?`,
      confirmText: "Oui, Tout Supprimer",
      onConfirm: async () => {
        try {
          setRecentJobs((prev) => prev.filter((j) => !jobIdsToDelete.includes(j.id)));
          setSelectedJobIds((prev) => prev.filter((id) => !jobIdsToDelete.includes(id)));
          await Promise.all(jobIdsToDelete.map((id) => deleteJob(id)));
        } catch (err) {
          console.error("Erreur suppression par lot:", err);
          loadRecentActivity();
        }
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Boîte de dialogue centrée Alter@Flux (remplaçant alert() navigateur)
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "info";
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  // Total des formats disponibles
  const totalFormatsCount = FORMAT_CATEGORIES.reduce((acc, cat) => acc + cat.formats.length, 0);

  // Catégories et formats filtrés dynamiquement (Organisé par catégorie)
  const filteredCategories = FORMAT_CATEGORIES.map((cat) => {
    const q = formatSearch.trim().toLowerCase();
    // Si pas de recherche et qu'une catégorie spécifique est sélectionnée
    if (!q && selectedFormatCategory !== "all" && cat.id !== selectedFormatCategory) {
      return null;
    }
    const matchedFormats = cat.formats.filter((f) => {
      if (!q) return true;
      return (
        f.id.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        f.ext.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q)
      );
    });
    if (matchedFormats.length === 0) return null;
    return { ...cat, formats: matchedFormats };
  }).filter(Boolean) as FormatCategory[];

  // Trouver la catégorie actuelle du format cible
  const currentCategoryOfTarget = FORMAT_CATEGORIES.find((cat) =>
    cat.formats.some((f) => f.id.toUpperCase() === targetFormat.toUpperCase())
  );

  // Écoute de la touche Échap pour fermer les modaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dialog.isOpen) {
          setDialog((prev) => ({ ...prev, isOpen: false }));
        } else if (isDropdownOpen) {
          setIsDropdownOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDropdownOpen, dialog.isOpen]);

  useEffect(() => {
    loadRecentActivity();
    const interval = setInterval(loadRecentActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  // Synchronisation du délai de 5 minutes avec localStorage et le backend public
  useEffect(() => {
    const savedUntil = localStorage.getItem("alteraflux_cooldown_until");
    if (savedUntil) {
      const remainingMs = parseInt(savedUntil, 10) - Date.now();
      if (remainingMs > 0) {
        setCooldownRemaining(Math.ceil(remainingMs / 1000));
      } else {
        localStorage.removeItem("alteraflux_cooldown_until");
      }
    }

    fetchCooldown()
      .then((data) => {
        if (data && data.remaining_seconds > 0) {
          setCooldownRemaining(data.remaining_seconds);
          localStorage.setItem("alteraflux_cooldown_until", (Date.now() + data.remaining_seconds * 1000).toString());
        }
      })
      .catch(() => {});
  }, []);

  // Décrémentation seconde par seconde du compte à rebours de 5 min
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("alteraflux_cooldown_until");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

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
      if (["mp4", "mov", "avi", "webm", "mkv", "flv", "wmv", "gif"].includes(ext)) {
        setFileType("Vidéo");
        setTargetFormat("MP4");
        setSelectedFormatCategory("video");
      } else if (["mp3", "wav", "aac", "flac", "ogg", "m4a", "opus", "wma"].includes(ext)) {
        setFileType("Audio");
        setTargetFormat("MP3");
        setSelectedFormatCategory("audio");
      } else if (["png", "jpg", "jpeg", "webp", "avif", "svg", "bmp", "tiff", "ico"].includes(ext)) {
        setFileType("Image");
        setTargetFormat("WEBP");
        setSelectedFormatCategory("image");
      } else if (["doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "ott", "rtf", "txt", "md", "tex", "latex", "xml", "html", "htm"].includes(ext)) {
        setFileType("Texte");
        setTargetFormat("PDF");
        setSelectedFormatCategory("document");
      } else if (["pdf", "xps", "oxps", "pdfa"].includes(ext)) {
        setFileType("PDF");
        setTargetFormat("DOCX");
        setSelectedFormatCategory("pdf");
      } else if (["xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm", "ods", "ots", "csv", "tsv"].includes(ext)) {
        setFileType("Tableur");
        setTargetFormat("PDF");
        setSelectedFormatCategory("spreadsheet");
      } else if (["ppt", "pptx", "pptm", "pps", "ppsx", "ppsm", "pot", "potx", "potm", "odp", "otp"].includes(ext)) {
        setFileType("Présentation");
        setTargetFormat("PDF");
        setSelectedFormatCategory("presentation");
      } else if (["mdb", "accdb", "db", "sqlite", "sqlite3"].includes(ext)) {
        setFileType("Base de données");
        setTargetFormat("SQLITE");
        setSelectedFormatCategory("database");
      } else if (["epub", "mobi", "azw", "azw3", "fb2", "cbz", "cbr"].includes(ext)) {
        setFileType("E-Book");
        setTargetFormat("PDF");
        setSelectedFormatCategory("ebook");
      } else if (["ps", "eps", "pub", "pmd", "indd", "idml"].includes(ext)) {
        setFileType("Publication");
        setTargetFormat("PDF");
        setSelectedFormatCategory("publishing");
      } else if (["dwg", "dxf", "dgn", "vsd", "vsdx", "vsdm"].includes(ext)) {
        setFileType("Technique");
        setTargetFormat("PDF");
        setSelectedFormatCategory("technical");
      } else if (["one", "enex", "opml"].includes(ext)) {
        setFileType("Notes");
        setTargetFormat("MD");
        setSelectedFormatCategory("notes");
      } else if (["py", "js", "ts", "rs", "go", "cpp", "c", "json", "yaml", "yml", "toml", "sql"].includes(ext)) {
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
    if (cooldownRemaining > 0) {
      setDialog({
        isOpen: true,
        type: "warning",
        title: "Délai d'attente actif (5 min)",
        message: "Afin de préserver les ressources du serveur public et garantir un accès gratuit et fluide à tous, chaque utilisateur doit patienter 5 minutes entre deux conversions.",
        details: `Temps d'attente restant avant votre prochaine conversion : ${formatCooldown(cooldownRemaining)}`,
        confirmText: "Compris"
      });
      return;
    }

    if (!selectedFile) {
      setDialog({
        isOpen: true,
        type: "info",
        title: "Sélectionnez un fichier",
        message: "Veuillez choisir un fichier sur votre appareil afin de démarrer la conversion vers le format " + targetFormat + ".",
        confirmText: "Parcourir mes fichiers",
        onConfirm: () => fileInputRef.current?.click()
      });
      return;
    }

    setIsConverting(true);
    setProgress(15);
    setStageText(`${targetFormat} (High Quality)...`);

    try {
      const presigned = await requestUploadUrl(selectedFile.name, selectedFile.type, selectedFile.size);
      await uploadFileDirect(presigned.upload_url, selectedFile, presigned.headers, presigned.key);

      const sourceExt = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      const jobCategory = selectedFormatCategory !== "all" ? selectedFormatCategory : (currentCategoryOfTarget?.id || undefined);

      const job = await createConversionJob({
        filename: selectedFile.name,
        source_key: presigned.key,
        source_format: sourceExt,
        target_format: targetFormat.toLowerCase(),
        category: jobCategory,
        source_size_bytes: selectedFile.size
      });

      // Activer le compte à rebours public de 5 minutes (300 secondes)
      const cooldownSec = 300;
      setCooldownRemaining(cooldownSec);
      localStorage.setItem("alteraflux_cooldown_until", (Date.now() + cooldownSec * 1000).toString());

      setActiveJob(job);
      listenJob(job.id);
    } catch (err: any) {
      setIsConverting(false);
      if (err?.status === 429) {
        const retryAfter = err.retryAfter || 300;
        setCooldownRemaining(retryAfter);
        localStorage.setItem("alteraflux_cooldown_until", (Date.now() + retryAfter * 1000).toString());
        setDialog({
          isOpen: true,
          type: "warning",
          title: "Délai d'attente actif (5 min)",
          message: "Afin de préserver les ressources du serveur public, chaque utilisateur dispose d'une conversion toutes les 5 minutes.",
          details: `Temps restant avant votre prochaine conversion : ${formatCooldown(retryAfter)}`,
          confirmText: "Patienter"
        });
        return;
      }
      const errMsg = err?.message || String(err) || "Erreur de conversion";
      setDialog({
        isOpen: true,
        type: "error",
        title: "Erreur de conversion",
        message: "Une erreur est survenue lors de l'envoi ou du traitement du fichier. Veuillez vérifier la connexion au serveur et réessayer.",
        details: errMsg,
        confirmText: "OK, Compris"
      });
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
            if (data.status === "FAILED") {
              setDialog({
                isOpen: true,
                type: "error",
                title: "Échec du traitement",
                message: data.error_message || "Le moteur de conversion a rencontré une anomalie lors du traitement.",
                details: `Tâche ID: ${jobId}`,
                confirmText: "Fermer"
              });
            }
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
          if (j.status === "FAILED") {
            setDialog({
              isOpen: true,
              type: "error",
              title: "Échec du traitement",
              message: j.error_message || "Le moteur de conversion a rencontré une anomalie lors du traitement.",
              details: `Tâche ID: ${jobId}`,
              confirmText: "Fermer"
            });
          }
        }
      } catch {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleDeleteJob = async (e: React.MouseEvent, job: JobResponse) => {
    e.stopPropagation();
    setDialog({
      isOpen: true,
      type: "warning",
      title: "Supprimer la conversion ?",
      message: `Voulez-vous vraiment supprimer "${job.filename}" de votre historique et effacer le fichier associé ?`,
      details: `Format cible: ${job.target_format.toUpperCase()} • Tâche ID: ${job.id}`,
      confirmText: "Oui, Supprimer",
      onConfirm: async () => {
        try {
          setRecentJobs((prev) => prev.filter((j) => j.id !== job.id));
          await deleteJob(job.id);
        } catch (err) {
          console.error("Erreur suppression:", err);
          loadRecentActivity();
        }
      }
    });
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
          {/* Logo Alter@Flux avec emblème Image 2 et nom de marque Image 1 */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => setActiveTab("Convert")}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md border border-slate-300 flex items-center justify-center bg-[#050F29] flex-shrink-0 group-hover:scale-105 transition">
              <img
                src="/icon.png"
                alt="Alter@Flux Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-[#177C88] group-hover:text-[#0D6E7A] transition font-sans">
              Alter@Flux
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
            2. CARTE PRINCIPALE STYLE WUZERD AVEC COULEURS ALTER@FLUX
            ========================================================== */}
        {activeTab === "Convert" && (
          <main className="w-full flex flex-col gap-10 py-4">
            {/* Titre Principal Hero Style Wuzerd */}
            <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto px-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                Convert your files <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-[#00D4FF] to-[#38bdf8] drop-shadow-[0_0_25px_rgba(0,229,255,0.4)]">
                  easily to any format!
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
                Use the fastest universal converter, we guarantee you&apos;ll get your file processed in seconds.
                You can start by drag and drop your files into the vault below.
              </p>
            </div>

            {/* Scène de la Voûte Centrale et Cartes Flottantes Orbitantes */}
            <div className="relative w-full max-w-5xl mx-auto px-4 flex flex-col items-center justify-center min-h-[500px]">
              
              {/* Icon 1 : Top-Left - AI / Vector 3D File Icon */}
              <div className="hidden md:flex absolute top-4 left-4 lg:left-8 z-0 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-1 w-20 h-26 sm:w-24 sm:h-30 rounded-2xl bg-gradient-to-b from-amber-50 via-slate-100 to-amber-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-2">
                    <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_6px_rgba(245,158,11,0.5)]">✒️</span>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-center text-[11px] tracking-wider border border-amber-300/60">
                    AI
                  </div>
                </div>
              </div>

              {/* Icon 2 : Mid-Left - PDF 3D File Icon (Tilted -8°) */}
              <div className="hidden lg:flex absolute top-36 left-0 xl:-left-2 z-0 -rotate-8 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-2 w-22 h-28 sm:w-26 sm:h-32 rounded-2xl bg-gradient-to-b from-rose-50 via-slate-100 to-red-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-1 gap-1">
                    <div className="w-8 h-1 bg-red-400/50 rounded-full" />
                    <div className="w-10 h-1 bg-red-400/40 rounded-full" />
                    <div className="w-6 h-1 bg-red-400/30 rounded-full" />
                    <span className="text-2xl mt-1 filter drop-shadow-[0_3px_5px_rgba(239,68,68,0.5)]">📕</span>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-center text-[11px] tracking-wider border border-red-300/60">
                    PDF
                  </div>
                </div>
              </div>

              {/* Icon 3 : Bottom-Left - PPT Presentation 3D File Icon */}
              <div className="hidden md:flex absolute bottom-8 left-6 lg:left-12 z-0 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-3 w-20 h-26 sm:w-24 sm:h-30 rounded-2xl bg-gradient-to-b from-orange-50 via-slate-100 to-orange-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-2">
                    <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_6px_rgba(249,115,22,0.5)]">📊</span>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-center text-[11px] tracking-wider border border-orange-300/60">
                    PPT
                  </div>
                </div>
              </div>

              {/* Icon 4 : Top-Center-Left - HTML / Code 3D File Icon */}
              <div className="hidden xl:flex absolute top-8 left-48 z-0 perspective-3d -rotate-6">
                <div className="standalone-file-3d animate-float-3d-1 w-18 h-24 sm:w-20 sm:h-26 rounded-2xl bg-gradient-to-b from-purple-50 via-slate-100 to-purple-100/90 border-2 border-white/90 flex flex-col justify-between p-2 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-1 text-purple-600 font-black text-base drop-shadow-[0_2px_4px_rgba(147,51,234,0.4)]">
                    &lt;/&gt;
                  </div>
                  <div className="badge-banner-3d w-full py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-center text-[10px] tracking-wider border border-purple-300/60">
                    HTML
                  </div>
                </div>
              </div>

              {/* Icon 5 : Top-Center-Right - TXT / Word 3D File Icon */}
              <div className="hidden xl:flex absolute top-8 right-48 z-0 perspective-3d rotate-6">
                <div className="standalone-file-3d animate-float-3d-3 w-18 h-24 sm:w-20 sm:h-26 rounded-2xl bg-gradient-to-b from-blue-50 via-slate-100 to-sky-100/90 border-2 border-white/90 flex flex-col justify-between p-2 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-1">
                    <span className="text-2xl filter drop-shadow-[0_3px_5px_rgba(59,130,246,0.5)]">📝</span>
                  </div>
                  <div className="badge-banner-3d w-full py-0.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 text-white font-black text-center text-[10px] tracking-wider border border-blue-300/60">
                    TXT
                  </div>
                </div>
              </div>

              {/* Icon 6 : Top-Right - ZIP Archive 3D File Icon */}
              <div className="hidden md:flex absolute top-4 right-4 lg:right-8 z-0 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-2 w-20 h-26 sm:w-24 sm:h-30 rounded-2xl bg-gradient-to-b from-yellow-50 via-slate-100 to-yellow-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-2">
                    <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_6px_rgba(234,179,8,0.5)]">📦</span>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-center text-[11px] tracking-wider border border-amber-200/80">
                    ZIP
                  </div>
                </div>
              </div>

              {/* Icon 7 : Mid-Right - MP4 Video 3D File Icon (Tilted +8°) */}
              <div className="hidden lg:flex absolute top-36 right-0 xl:-right-2 z-0 rotate-8 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-1 w-22 h-28 sm:w-26 sm:h-32 rounded-2xl bg-gradient-to-b from-sky-50 via-slate-100 to-cyan-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00E5FF] to-sky-400 text-[#050F29] flex items-center justify-center shadow-lg shadow-[#00E5FF]/60 group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-[#050F29] ml-0.5" />
                    </div>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#00A3BD] text-[#050F29] font-black text-center text-[11px] tracking-wider border border-cyan-200/80">
                    MP4
                  </div>
                </div>
              </div>

              {/* Icon 8 : Bottom-Right - JPEG / Image 3D File Icon */}
              <div className="hidden md:flex absolute bottom-8 right-6 lg:right-12 z-0 perspective-3d">
                <div className="standalone-file-3d animate-float-3d-3 w-20 h-26 sm:w-24 sm:h-30 rounded-2xl bg-gradient-to-b from-emerald-50 via-slate-100 to-teal-100/90 border-2 border-white/90 flex flex-col justify-between p-2.5 shadow-2xl relative group">
                  <div className="doc-fold-corner-3d" />
                  <div className="flex-1 flex flex-col items-center justify-center pt-2">
                    <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_6px_rgba(16,185,129,0.5)]">🖼️</span>
                  </div>
                  <div className="badge-banner-3d w-full py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-center text-[11px] tracking-wider border border-emerald-300/60">
                    JPEG
                  </div>
                </div>
              </div>

              {/* ==========================================================
                  VOÛTE CENTRALE D'UPLOAD (ARCH DROPZONE) STYLE WUZERD
                  ========================================================== */}
              <div className="w-full max-w-md wuzerd-arch-card rounded-t-[140px] sm:rounded-t-[180px] rounded-b-3xl p-6 sm:p-10 flex flex-col items-center text-center gap-6 relative z-10 shadow-2xl transition hover:border-[#00E5FF]/60">
                
                {/* Icône Centrale '+' dans un cerclage lumineux */}
                <div
                  className="w-16 h-16 rounded-full border-2 border-dashed border-[#00E5FF]/60 bg-[#050F29]/90 flex items-center justify-center text-[#00E5FF] shadow-lg shadow-[#00E5FF]/20 cursor-pointer group hover:scale-110 hover:border-[#00E5FF] transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-3xl font-light stroke-[1] text-[#00E5FF] group-hover:rotate-90 transition-transform duration-300">
                    +
                  </span>
                </div>

                {/* Zone Texte d'Upload */}
                <div
                  className="flex flex-col items-center gap-2 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                    {selectedFile ? fileName : "Drag & Drop files here"}
                  </h3>
                  {selectedFile ? (
                    <p className="text-xs text-[#00E5FF] font-bold">
                      {fileSize} • {fileType} • <span className="underline">Changer</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">or</p>
                  )}
                  
                  {!selectedFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-1 px-5 py-2 rounded-xl bg-[#1A7A86] hover:bg-[#1E8E9B] text-white text-xs font-bold shadow-md shadow-[#1A7A86]/40 transition border border-white/20"
                    >
                      Browse
                    </button>
                  )}
                </div>

                {/* Barre de sélection de formats intégrée dans la voûte */}
                <div className="w-full bg-[#050F29]/90 rounded-2xl p-2.5 border border-[#00E5FF]/25 flex items-center justify-between gap-2 shadow-inner">
                  {/* Filtre Source */}
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="bg-transparent text-white text-[11px] font-bold px-2 py-1 focus:outline-none cursor-pointer border-none max-w-[120px] truncate"
                  >
                    <option value="Select file type" className="bg-[#050F29] text-white">Source Auto</option>
                    <option value="video" className="bg-[#050F29] text-white">🎬 Vidéo</option>
                    <option value="audio" className="bg-[#050F29] text-white">🎵 Audio</option>
                    <option value="image" className="bg-[#050F29] text-white">🖼️ Images</option>
                    <option value="document" className="bg-[#050F29] text-white">📄 Docs</option>
                    <option value="pdf" className="bg-[#050F29] text-white">📕 PDF</option>
                    <option value="code" className="bg-[#050F29] text-white">💻 Code</option>
                  </select>

                  <span className="text-slate-400 text-xs font-bold">→</span>

                  {/* Bouton Format Cible qui ouvre le Modal (+50 formats) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentCategoryOfTarget) {
                        setSelectedFormatCategory(currentCategoryOfTarget.id);
                      }
                      setIsDropdownOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-[#00E5FF] hover:bg-[#33EBFF] text-[#050F29] px-3.5 py-1.5 rounded-xl font-black text-xs shadow-md shadow-[#00E5FF]/30 transition transform hover:scale-105 cursor-pointer border border-[#00E5FF]"
                    title="Cliquer pour choisir le format cible souhaité (+50 formats disponibles)"
                  >
                    <span className="tracking-wider">{targetFormat}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#050F29] stroke-[3]" />
                  </button>
                </div>

                {/* Note Légale sous la voûte */}
                <p className="text-[10px] text-slate-400 font-medium leading-tight max-w-xs">
                  By using our converter you agree to our <span className="underline cursor-pointer hover:text-white">Terms of Service</span> and <span className="underline cursor-pointer hover:text-white">Privacy Policy</span>.
                </p>
              </div>
            </div>

            {/* Carte de progression et d'action (s'affiche lors de la conversion ou prêt) */}
            <div className="w-full max-w-3xl mx-auto wuzerd-dark-panel p-5 sm:p-6 text-white relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 text-xs sm:text-sm font-mono">
                <div>
                  <span className="text-white font-bold">Converting: </span>
                  <span className="text-[#00E5FF] font-black text-base">{progress}%</span>
                  <span className="text-slate-300 font-medium"> | {stageText}</span>
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
                ) : cooldownRemaining > 0 ? (
                  <button
                    type="button"
                    onClick={handleStartConversion}
                    className="btn-3d-glass !py-2 !px-5 text-xs sm:text-sm font-extrabold shadow-lg border border-cyan-400/50 cursor-pointer flex items-center gap-2"
                    title={`Délai public actif : 1 conversion toutes les 5 minutes. Temps restant : ${formatCooldown(cooldownRemaining)}`}
                  >
                    <Clock className="w-4 h-4 text-[#00E5FF] animate-pulse" />
                    <span className="font-mono font-black text-[#0B1021]">
                      Attente : {formatCooldown(cooldownRemaining)}
                    </span>
                  </button>
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

              {/* Barre de progression cyan */}
              <div className="w-full h-3 rounded-full bg-[#030614] overflow-hidden relative border border-cyan-900/40">
                <div
                  className="h-full rounded-full vectra-progress-cyan transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* ==========================================================
                3. SECTION PREUVE & CARACTÉRISTIQUES (STYLE WUZERD)
                ========================================================== */}
            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Carte 1 */}
              <div className="wuzerd-dark-panel p-6 flex flex-col items-center text-center gap-4 hover:border-[#00E5FF]/50 transition group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/30 to-amber-300/10 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold text-xl shadow-lg glow-halo-amber group-hover:scale-105 transition">
                  ⚡
                </div>
                <h3 className="font-extrabold text-base text-white">
                  The easiest way to convert your files
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  You can easily convert your design, media, and code files using AlteraFlux. AlteraFlux is the fastest universal converter on the market.
                </p>
              </div>

              {/* Carte 2 */}
              <div className="wuzerd-dark-panel p-6 flex flex-col items-center text-center gap-4 hover:border-[#00E5FF]/50 transition group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1A7A86]/50 to-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] font-extrabold text-xl shadow-lg glow-halo-cyan group-hover:scale-105 transition">
                  📄
                </div>
                <h3 className="font-extrabold text-base text-white">
                  Supports +50 file formats
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  AlteraFlux supports many file extensions: Video, Audio, Image, Documents (PDF, DOCX), Spreadsheets, E-Books, Databases, and Code.
                </p>
              </div>

              {/* Carte 3 */}
              <div className="wuzerd-dark-panel p-6 flex flex-col items-center text-center gap-4 hover:border-[#00E5FF]/50 transition group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500/30 to-emerald-300/10 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-extrabold text-xl shadow-lg glow-halo-teal group-hover:scale-105 transition">
                  24/7
                </div>
                <h3 className="font-extrabold text-base text-white">
                  24/7 Live async engine
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Thanks to our decoupled worker pipeline, you get instant responses with real-time WebSocket progress reporting whenever you convert.
                </p>
              </div>
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
                  Historique de vos conversions terminées et prêtes au téléchargement
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

            {/* Filtres de catégories pour My Files (Affichage uniquement des fichiers convertis prêts) */}
            {(() => {
              // Filtrer uniquement les conversions réussies (COMPLETED) prêtes au téléchargement / suppression
              const completedJobs = recentJobs.filter((job) => job.status === "COMPLETED");

              return (
                <>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setMyFilesCategory("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        myFilesCategory === "all"
                          ? "bg-[#080C27] text-white shadow-sm"
                          : "bg-white/80 text-[#334155] hover:bg-white border border-slate-200"
                      }`}
                    >
                      <span>🌟</span>
                      <span>Tous</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-[#475569]">
                        {completedJobs.length}
                      </span>
                    </button>
                    {FORMAT_CATEGORIES.map((cat) => {
                      const count = completedJobs.filter((job) => {
                        const ext = (job.target_format || "").toLowerCase();
                        return cat.formats.some((f) => f.ext.toLowerCase() === ext || f.id.toLowerCase() === ext);
                      }).length;
                      if (count === 0 && myFilesCategory !== cat.id) return null;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setMyFilesCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            myFilesCategory === cat.id
                              ? "bg-[#00E5FF] text-[#080C27] font-extrabold shadow-sm"
                              : "bg-white/80 text-[#334155] hover:bg-white border border-slate-200"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-[#475569]">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Barre d'actions par lot : Sélectionner Tout | Tout Télécharger | Tout Supprimer */}
                  {(() => {
                    const visibleJobs = completedJobs.filter((job) => {
                      if (myFilesCategory === "all") return true;
                      const cat = FORMAT_CATEGORIES.find((c) => c.id === myFilesCategory);
                      if (!cat) return true;
                      const ext = (job.target_format || "").toLowerCase();
                      return cat.formats.some((f) => f.ext.toLowerCase() === ext || f.id.toLowerCase() === ext);
                    });
                    const isAllVisibleSelected = visibleJobs.length > 0 && visibleJobs.every((j) => selectedJobIds.includes(j.id));
                    const selectedVisibleJobs = visibleJobs.filter((j) => selectedJobIds.includes(j.id));
                    const hasSelection = selectedVisibleJobs.length > 0;

                    return (
                      <div className="flex flex-col gap-3">
                        {visibleJobs.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-inner">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs font-extrabold text-[#0B1021] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isAllVisibleSelected}
                                  onChange={() => handleToggleSelectAll(visibleJobs)}
                                  className="w-4 h-4 rounded border-slate-300 text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                                />
                                <span>Sélectionner tout ({selectedVisibleJobs.length}/{visibleJobs.length})</span>
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBatchDownload(hasSelection ? selectedVisibleJobs : visibleJobs)}
                                className="btn-3d-cyan-sm !py-1.5 !px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                title={hasSelection ? "Télécharger les fichiers sélectionnés" : "Télécharger tous les fichiers visibles"}
                              >
                                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{hasSelection ? `Télécharger la sélection (${selectedVisibleJobs.length})` : "Tout Télécharger"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBatchDelete(hasSelection ? selectedVisibleJobs.map((j) => j.id) : visibleJobs.map((j) => j.id))}
                                className="btn-3d-danger !py-1.5 !px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                                title={hasSelection ? "Supprimer les fichiers sélectionnés" : "Supprimer tous les fichiers visibles"}
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                                <span>{hasSelection ? `Supprimer la sélection (${selectedVisibleJobs.length})` : "Tout Supprimer"}</span>
                              </button>
                            </div>
                          </div>
                        )}

                  {visibleJobs.length > 0 ? (
                    visibleJobs.map((job) => {
                      const isChecked = selectedJobIds.includes(job.id);
                      const getCategoryIcon = (category: string) => {
                        switch (category) {
                          case "video": return "🎬";
                          case "audio": return "🎵";
                          case "image": return "🖼️";
                          case "document": return "📄";
                          case "ebook": return "📚";
                          case "archive": return "📦";
                          case "code": return "💻";
                          default: return "📄";
                        }
                      };

                      return (
                        <div
                          key={job.id}
                          className={`vectra-file-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md border ${
                            isChecked ? "border-[#00E5FF] bg-cyan-50/40 ring-1 ring-[#00E5FF]/40" : "border-[#E2E8F0]"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox de sélection individuelle */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectJob(job.id)}
                              className="w-4 h-4 rounded border-slate-300 text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer shrink-0"
                            />

                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-50 to-teal-100/70 border border-[#1A7A86]/25 flex items-center justify-center text-xl shrink-0 shadow-sm">
                              <span>{getCategoryIcon(job.category)}</span>
                            </div>
                            <div className="truncate">
                              <h4 className="font-extrabold text-sm sm:text-base text-[#0B1021] truncate max-w-md" title={job.result_filename || job.filename}>
                                {job.result_filename || (job.filename.includes(".") ? `${job.filename.substring(0, job.filename.lastIndexOf("."))}.${job.target_format.toLowerCase()}` : `${job.filename}.${job.target_format.toLowerCase()}`)}
                              </h4>
                              <div className="text-xs text-[#475569] font-semibold flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="font-bold text-[#1A7A86] bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                                  {job.source_format.toUpperCase()} → {job.target_format.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                  job.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : job.status === "FAILED"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-cyan-100 text-cyan-800 border border-cyan-300"
                                }`}>
                                  {job.status === "COMPLETED" ? "Traité" : job.status}
                                </span>
                                {(job.result_size_bytes || job.source_size_bytes) ? (
                                  <span className="text-slate-400 text-[11px]">
                                    {(((job.result_size_bytes || job.source_size_bytes) || 0) / (1024 * 1024)).toFixed(1)} MB
                                  </span>
                                ) : null}
                                <span className="text-slate-400 text-[11px] italic">
                                  (Source: {job.filename})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions devant chaque fichier : Télécharger et Supprimer */}
                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                            <a
                              href={getDownloadUrl(job)}
                              download={job.result_filename || job.filename}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-3d-cyan-sm !text-xs !py-1.5 !px-3.5 font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                              title="Télécharger le fichier traité"
                            >
                              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Télécharger</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteJob(e, job)}
                              className="btn-3d-danger !text-xs !py-1.5 !px-3.5 font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                              title="Supprimer cette conversion"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-[#475569]">
                      <p className="font-bold text-base text-[#0B1021]">Aucun fichier dans cette catégorie</p>
                      <p className="text-xs mt-1">Lancez une conversion pour voir vos fichiers ici.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        );
      })()}
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
                Intégrez le moteur de conversion Alter@Flux dans vos applications
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

      {/* ==========================================================
          MODAL DE SÉLECTION DU FORMAT CIBLE (+50 FORMATS)
          ========================================================== */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-[90] bg-[#050F29]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsDropdownOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header du Modal avec Recherche & Bouton Fermer */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-sm shadow-[#00E5FF]/50" />
                  <h2 className="text-lg sm:text-xl font-black text-[#0B1021] tracking-tight">
                    Format de conversion cible
                  </h2>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 text-[#1A7A86] border border-cyan-100">
                    {totalFormatsCount} formats
                  </span>
                </div>
                <p className="text-xs text-[#64748B] font-medium mt-0.5">
                  Sélectionnez une catégorie à gauche pour explorer et choisir le format cible souhaité
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Barre de recherche avec loupe et bouton clear */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formatSearch}
                    onChange={(e) => setFormatSearch(e.target.value)}
                    placeholder="Rechercher (ex: mp4, webp, pdf, docx, ts...)"
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#00D4FF] focus:bg-white text-[#0F172A] font-bold placeholder-[#94A3B8] transition"
                    autoFocus
                  />
                  {formatSearch && (
                    <button
                      type="button"
                      onClick={() => setFormatSearch("")}
                      className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bouton fermeture */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="p-2 rounded-xl text-[#64748B] hover:text-[#0B1021] hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Contenu en Deux Colonnes : Catégories à gauche | Formats à droite */}
            <div className="flex-1 flex overflow-hidden min-h-[380px]">
              {/* Colonne de gauche : Liste des Catégories */}
              <aside className="w-56 sm:w-64 bg-slate-50/90 border-r border-[#E2E8F0] p-2.5 flex flex-col gap-1 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
                  Catégories
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFormatCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    selectedFormatCategory === "all"
                      ? "bg-[#080C27] text-white shadow-sm"
                      : "text-[#334155] hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🌟</span>
                    <span>Toutes les catégories</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      selectedFormatCategory === "all"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-[#64748B]"
                    }`}
                  >
                    {totalFormatsCount}
                  </span>
                </button>

                {FORMAT_CATEGORIES.map((cat) => {
                  const isSelected = selectedFormatCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedFormatCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        isSelected
                          ? "bg-[#00E5FF]/20 text-[#1A7A86] border border-[#00E5FF]/50 shadow-sm font-extrabold"
                          : "text-[#334155] hover:bg-slate-200/60"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base">{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold flex-shrink-0 ${
                          isSelected
                            ? "bg-[#1A7A86] text-white"
                            : "bg-slate-200 text-[#64748B]"
                        }`}
                      >
                        {cat.formats.length}
                      </span>
                    </button>
                  );
                })}
              </aside>

              {/* Colonne de droite : Grille des Formats Organisée par Catégorie */}
              <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white flex flex-col gap-6">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <section key={cat.id} className="flex flex-col gap-3">
                      {/* En-tête de catégorie */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.icon}</span>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#0B1021]">
                            {cat.name}
                          </h3>
                        </div>
                        <span className="text-xs text-[#64748B] font-semibold">
                          {cat.formats.length} format{cat.formats.length > 1 ? "s" : ""} disponible{cat.formats.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Grille des formats de cette catégorie */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {cat.formats.map((item) => {
                          const isTarget = targetFormat.toUpperCase() === item.id.toUpperCase();
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setTargetFormat(item.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`group p-3 rounded-xl border text-left transition flex flex-col justify-between relative hover:scale-[1.02] hover:shadow-md cursor-pointer ${
                                isTarget
                                  ? "bg-gradient-to-tr from-cyan-50/70 to-teal-50/70 border-[#1A7A86] ring-2 ring-[#1A7A86]/30 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-cyan-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${item.badgeColor}`}
                                >
                                  {item.id}
                                </span>
                                {isTarget && (
                                  <span className="w-5 h-5 rounded-full bg-[#1A7A86] text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>

                              <div className="mt-2">
                                <p className="text-xs font-bold text-[#0B1021] group-hover:text-[#1A7A86] transition">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-[#64748B] font-medium leading-tight mt-0.5 line-clamp-2">
                                  {item.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-[#64748B]">
                    <Search className="w-10 h-10 text-[#CBD5E1] mb-2" />
                    <p className="font-extrabold text-sm text-[#0B1021]">Aucun format trouvé</p>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                      Aucun format ne correspond à &quot;{formatSearch}&quot;. Essayez un autre terme ou explorez une catégorie.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormatSearch("");
                        setSelectedFormatCategory("all");
                      }}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0F172A] transition"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                )}
              </main>
            </div>

            {/* 3. Pied de page du Modal avec Résumé et Bouton de validation */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#64748B] font-medium">Format sélectionné :</span>
                <span className="px-2 py-0.5 rounded bg-[#080C27] text-white font-extrabold text-xs">
                  {targetFormat}
                </span>
                <span className="text-[#1A7A86] font-bold">
                  ({currentCategoryOfTarget ? currentCategoryOfTarget.name : "Format"})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="btn-3d-cyan !py-1.5 !px-5 text-xs font-extrabold cursor-pointer"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          BOÎTE DE DIALOGUE MODERNE SYNCHRONISÉE ALTER@FLUX (AJUSTAGE CENTRÉ)
          ========================================================== */}
      {dialog.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#050F29]/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="w-full max-w-md vectra-glass-panel p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-2xl border border-white/70 relative overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lueur d'ambiance néon Alter@Flux */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00E5FF]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#1A7A86]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Bouton fermeture Croix (X) */}
            <button
              type="button"
              onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Badge icône thématique centré */}
            <div className="mt-1">
              {dialog.type === "error" && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/80 border border-rose-200/90 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/15">
                  <AlertCircle className="w-8 h-8 stroke-[2.2]" />
                </div>
              )}
              {dialog.type === "warning" && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/80 border border-amber-200/90 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/15">
                  <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
                </div>
              )}
              {dialog.type === "success" && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-teal-50 to-teal-100/80 border border-[#1A7A86]/30 flex items-center justify-center text-[#1A7A86] shadow-lg shadow-teal-500/15">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                </div>
              )}
              {dialog.type === "info" && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-50 to-cyan-100/80 border border-[#00E5FF]/40 flex items-center justify-center text-[#00A3BD] shadow-lg shadow-cyan-500/15">
                  <Info className="w-8 h-8 stroke-[2.2]" />
                </div>
              )}
            </div>

            {/* Titre et Message */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-[#0B1021] tracking-tight">
                {dialog.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#334155] font-semibold leading-relaxed max-w-sm">
                {dialog.message}
              </p>
            </div>

            {/* Détails techniques / Rapport d'erreur (si présent) */}
            {dialog.details && (
              <div className="w-full vectra-progress-card p-3 rounded-xl text-left font-mono text-[11px] text-[#00E5FF] border border-white/10 shadow-inner overflow-x-auto select-all">
                <span className="text-slate-400 block text-[10px] mb-1 font-sans font-bold">// Rapport technique :</span>
                <code>{dialog.details}</code>
              </div>
            )}

            {/* Bouton tactile 3D centré */}
            <div className="flex items-center justify-center w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  const cb = dialog.onConfirm;
                  setDialog((prev) => ({ ...prev, isOpen: false }));
                  if (cb) cb();
                }}
                className="btn-3d-cyan !px-8 !py-2.5 text-xs sm:text-sm font-extrabold shadow-md cursor-pointer"
              >
                <span>{dialog.confirmText || "OK, Compris"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
