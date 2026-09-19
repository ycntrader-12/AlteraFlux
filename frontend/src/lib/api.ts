const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "server";
  let cid = localStorage.getItem("alteraflux_client_id");
  if (!cid) {
    cid = "af_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
    localStorage.setItem("alteraflux_client_id", cid);
  }
  return cid;
}

export interface CooldownResponse {
  cooldown_seconds: number;
  remaining_seconds: number;
  is_allowed: boolean;
}

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
  headers: Record<string, string> = {},
  key?: string
): Promise<void> {
  // Si c'est un endpoint direct relatif du backend
  const targetUrl = uploadUrl.startsWith("http") ? uploadUrl : `${API_BASE}${uploadUrl}`;

  // Si c'est l'endpoint backend upload-direct fallback
  if (targetUrl.includes("/api/v1/storage/upload-direct")) {
    const formData = new FormData();
    formData.append("file", file);
    let url = targetUrl;
    if (key && !url.includes("key=")) {
      url += (url.includes("?") ? "&" : "?") + `key=${encodeURIComponent(key)}`;
    }
    const res = await fetch(url, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Échec du téléversement direct");
    return;
  }

  // Upload PUT direct vers MinIO / S3 / Supabase
  let putSuccess = false;
  try {
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        ...headers
      },
      body: file
    });
    if (res.ok) {
      putSuccess = true;
    } else {
      console.warn(`Upload S3 direct échoué (${res.status}), essai du fallback direct...`);
    }
  } catch (netErr) {
    console.warn("Upload S3 direct non joignable (réseau/CORS), bascule automatique sur upload-direct:", netErr);
  }

  if (putSuccess) {
    return;
  }

  // Si l'upload S3 direct a échoué, on tente le fallback upload-direct côté serveur
  const formData = new FormData();
  formData.append("file", file);
  let fallbackUrl = `${API_BASE}/api/v1/storage/upload-direct`;
  if (key) {
    fallbackUrl += `?key=${encodeURIComponent(key)}`;
  }
  const fallbackRes = await fetch(fallbackUrl, {
    method: "POST",
    body: formData
  });
  if (!fallbackRes.ok) {
    const errText = await fallbackRes.text().catch(() => "");
    throw new Error(`Échec du téléversement du fichier (${fallbackRes.status}) ${errText}`);
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
    headers: {
      "Content-Type": "application/json",
      "x-client-id": getOrCreateClientId()
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After") || "300";
      const e = new Error(err.detail || "Veuillez patienter 5 minutes entre chaque conversion.") as any;
      e.status = 429;
      e.retryAfter = parseInt(retryAfter, 10);
      throw e;
    }
    throw new Error(err.detail || "Échec de création du job de conversion");
  }

  return await res.json();
}

export async function fetchCooldown(): Promise<CooldownResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/conversions/cooldown`, {
      headers: { "x-client-id": getOrCreateClientId() }
    });
    if (!res.ok) return { cooldown_seconds: 300, remaining_seconds: 0, is_allowed: true };
    return await res.json();
  } catch {
    return { cooldown_seconds: 300, remaining_seconds: 0, is_allowed: true };
  }
}

export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/v1/conversions/jobs/${jobId}`, {
    headers: { "x-client-id": getOrCreateClientId() }
  });
  if (!res.ok) throw new Error("Job introuvable");
  return await res.json();
}

export async function listRecentJobs(): Promise<JobResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/conversions/jobs?limit=20`, {
      headers: { "x-client-id": getOrCreateClientId() }
    });
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

export function getDownloadUrl(job: JobResponse): string {
  if (job.download_url) {
    if (job.download_url.startsWith("http")) return job.download_url;
    return `${API_BASE}${job.download_url}`;
  }
  return `${API_BASE}/api/v1/conversions/jobs/${job.id}/download`;
}
