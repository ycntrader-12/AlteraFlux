const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PresignedUrlResponse {
  upload_url: string;
  key: string;
  filename: string;
  expires_in_seconds: number;
  headers: Record<string, string>;
  is_direct_upload: boolean;
}

export interface JobResponse {
  id: string;
  filename: string;
  source_key: string;
  source_format: string;
  source_size_bytes: number;
  target_format: string;
  category: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
  progress: number;
  stage: string;
  options: Record<string, any>;
  result_key?: string;
  result_filename?: string;
  result_size_bytes?: number;
  download_url?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

export interface PresetCategory {
  category: string;
  title: string;
  description: string;
  icon: string;
  source_extensions: string[];
  target_formats: {
    id: string;
    label: string;
    description: string;
    popular: boolean;
  }[];
  options_schema: any[];
}

export async function fetchPresets(): Promise<PresetCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/presets`);
    if (!res.ok) throw new Error("Échec du chargement des presets");
    return await res.json();
  } catch (err) {
    console.warn("Utilisation des presets par défaut:", err);
    return [];
  }
}

export async function requestUploadUrl(
  filename: string,
  contentType: string,
  sizeBytes: number
): Promise<PresignedUrlResponse> {
  const res = await fetch(`${API_BASE}/api/v1/storage/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      content_type: contentType || "application/octet-stream",
      size_bytes: sizeBytes
    }),
  });

  if (!res.ok) {
    throw new Error(`Erreur génération URL de téléversement (${res.status})`);
  }

  return await res.json();
}

export async function uploadFileDirect(
  uploadUrl: string,
  file: File,
  headers: Record<string, string> = {}
): Promise<void> {
  // Si c'est un endpoint direct relatif du backend
  const targetUrl = uploadUrl.startsWith("http") ? uploadUrl : `${API_BASE}${uploadUrl}`;

  // Si c'est l'endpoint backend upload-direct fallback
  if (targetUrl.includes("/api/v1/storage/upload-direct")) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(targetUrl, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Échec du téléversement direct");
    return;
  }

  // Upload PUT direct vers MinIO / S3 / Supabase
  const res = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...headers
    },
    body: file
  });

  if (!res.ok) {
    // Si l'upload S3 direct échoue (ex: CORS MinIO en local), on tente le fallback upload-direct
    console.warn("Upload S3 direct échoué, essai du fallback direct multipart...");
    const formData = new FormData();
    formData.append("file", file);
    const fallbackRes = await fetch(`${API_BASE}/api/v1/storage/upload-direct`, {
      method: "POST",
      body: formData
    });
    if (!fallbackRes.ok) throw new Error("Échec du téléversement du fichier.");
  }
}

export async function createConversionJob(data: {
  filename: string;
  source_key: string;
  source_format: string;
  target_format: string;
  category?: string;
  source_size_bytes?: number;
  options?: Record<string, any>;
}): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/v1/conversions/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Échec de création du job de conversion");
  }

  return await res.json();
}

export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/v1/conversions/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job introuvable");
  return await res.json();
}

export async function listRecentJobs(): Promise<JobResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/conversions/jobs?limit=20`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/conversions/jobs/${jobId}`, {
    method: "DELETE"
  });
}
