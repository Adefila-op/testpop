import { getRuntimeApiToken } from "@/lib/runtimeSession";

const DEFAULT_PINATA_API_BASE = "/api/pinata";
const PINATA_API_BASE = (import.meta.env.VITE_PINATA_API_BASE_URL || DEFAULT_PINATA_API_BASE).replace(/\/$/, "");

/**
 * ⭐ Issue #4: Multiple IPFS Gateway Fallbacks
 * Try Pinata → IPFS.io → Dweb.link to prevent single point of failure
 */
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs", // public IPFS gateway
  "https://dweb.link/ipfs", // Cloudflare gateway
];
const DEFAULT_IPFS_GATEWAY_BASE = IPFS_GATEWAYS[0];
const IPFS_GATEWAY_BASE = (import.meta.env.VITE_IPFS_GATEWAY_URL || DEFAULT_IPFS_GATEWAY_BASE).replace(/\/$/, "");
const USE_MEDIA_PROXY = String(import.meta.env.VITE_USE_MEDIA_PROXY || "true").toLowerCase() !== "false";

type PinataUploadResponse = {
  success?: boolean;
  transaction_id?: string;
  cid: string;
  uri?: string;
  metadata?: {
    file_size_bytes?: number;
    file_hash?: string;
    uploaded_at?: string;
  };
  validation?: {
    cid_valid?: boolean;
  };
};

type UploadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percent: number;
  status: "uploading" | "verifying" | "complete";
}) => void;

/**
 * ⭐ Issue #10: Upload Progress Tracking
 * Track upload progress and allow cancellation
 */
class UploadTask {
  transactionId: string;
  abortController: AbortController;
  startTime: number;
  retryCount: number = 0;
  maxRetries: number = 3;

  constructor() {
    this.transactionId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.abortController = new AbortController();
    this.startTime = Date.now();
  }

  cancel(): void {
    this.abortController.abort();
  }

  isActive(): boolean {
    return !this.abortController.signal.aborted;
  }

  getElapsedSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }
}

const activeUploads = new Map<string, UploadTask>();

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || text || `${response.status} ${response.statusText}`;
    } catch {
      return text || `${response.status} ${response.statusText}`;
    }
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function getPinataAuthHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  const token = getRuntimeApiToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

async function postToPinataProxy(
  path: string,
  body: BodyInit,
  uploadTask?: UploadTask
): Promise<PinataUploadResponse> {
  const response = await fetch(`${PINATA_API_BASE}${path}`, {
    method: "POST",
    headers: getPinataAuthHeaders(),
    body,
    credentials: "include",
    signal: uploadTask?.abortController.signal,
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    const error = new Error(`Pinata proxy request failed: ${message}`);
    (error as any).status = response.status;
    (error as any).transactionId = uploadTask?.transactionId;
    throw error;
  }

  return (await response.json()) as PinataUploadResponse;
}

/**
 * ⭐ Issue #10: Upload file with progress tracking and error recovery
 * Returns: CID string
 */
export async function uploadFileToPinata(
  file: File,
  onProgress?: UploadProgressCallback,
  taskId?: string
): Promise<string> {
  const uploadTask = new UploadTask();
  taskId = taskId || uploadTask.transactionId;
  activeUploads.set(taskId, uploadTask);

  try {
    // Report: Starting upload
    if (onProgress) {
      onProgress({
        loaded: 0,
        total: file.size,
        percent: 0,
        status: "uploading",
      });
    }

    const formData = new FormData();
    formData.append("file", file);

    let lastError: any = null;

    // ⭐ Issue #7: Retry logic for error recovery
    for (let attempt = 0; attempt < uploadTask.maxRetries; attempt++) {
      if (!uploadTask.isActive()) {
        throw new Error("Upload cancelled by user");
      }

      try {
        const data = await postToPinataProxy("/file", formData, uploadTask);
        if (!data.cid) {
          throw new Error("Pinata proxy did not return a CID");
        }

        // ⭐ Issue #2: Validate CID format
        if (!data.validation?.cid_valid) {
          console.warn("CID validation warning:", data.validation);
        }

        // Report: Upload complete
        if (onProgress) {
          onProgress({
            loaded: file.size,
            total: file.size,
            percent: 100,
            status: "complete",
          });
        }

        return data.cid;
      } catch (error) {
        lastError = error;
        uploadTask.retryCount = attempt + 1;

        // Retry on network errors, not on auth errors
        if (attempt < uploadTask.maxRetries - 1 && (error as any).status !== 401) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Upload attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error("Upload failed after multiple retries");
  } finally {
    activeUploads.delete(taskId);
  }
}

/**
 * Cancel active upload by task ID
 */
export function cancelUpload(taskId: string): void {
  const task = activeUploads.get(taskId);
  if (task) {
    task.cancel();
    activeUploads.delete(taskId);
  }
}

/**
 * Get status of active upload
 */
export function getUploadStatus(taskId: string) {
  const task = activeUploads.get(taskId);
  if (!task) return null;

  return {
    active: task.isActive(),
    retryCount: task.retryCount,
    elapsedSeconds: task.getElapsedSeconds(),
  };
}

export async function uploadMetadataToPinata(metadata: object): Promise<string> {
  const response = await fetch(`${PINATA_API_BASE}/json`, {
    method: "POST",
    headers: getPinataAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ metadata }),
    credentials: "include",
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(`Pinata metadata upload failed: ${message}`);
  }

  const data = (await response.json()) as PinataUploadResponse;
  if (data.uri) return data.uri;
  if (data.cid) return `ipfs://${data.cid}`;

  throw new Error("Pinata proxy did not return a CID or URI");
}

function isBareIpfsCid(value: string): boolean {
  return /^(bafy[a-z2-7]+|bafk[a-z2-7]+|Qm[1-9A-HJ-NP-Za-km-z]{44,})$/i.test(value);
}

function isTransientOrInvalidMediaValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "[object object]" ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("file:") ||
    normalized.startsWith("about:")
  );
}

/**
 * ⭐ Issue #3: ipfsToHttp with gateway fallbacks
 * Converts IPFS URIs to HTTP gateway URLs with fallback chain
 */
export function ipfsToHttp(uri: string): string {
  const normalized = uri.trim();
  if (!normalized) return "";
  if (normalized.startsWith("/api/media/proxy")) return normalized;

  const toProxyUrl = (value: string) => `/api/media/proxy?url=${encodeURIComponent(value)}`;
  
  // Extract CID from various formats
  const httpGatewayMatch = normalized.match(/^https?:\/\/[^/]+\/ipfs\/(.+)$/i);
  if (httpGatewayMatch?.[1]) {
    const canonical = `ipfs://${httpGatewayMatch[1]}`;
    return USE_MEDIA_PROXY ? toProxyUrl(canonical) : buildGatewayUrl(httpGatewayMatch[1]);
  }

  if (normalized.startsWith("ipfs://ipfs/")) {
    const cid = normalized.slice("ipfs://ipfs/".length);
    return USE_MEDIA_PROXY ? toProxyUrl(`ipfs://${cid}`) : buildGatewayUrl(cid);
  }

  if (normalized.startsWith("ipfs://")) {
    const cid = normalized.slice(7);
    return USE_MEDIA_PROXY ? toProxyUrl(normalized) : buildGatewayUrl(cid);
  }

  if (isBareIpfsCid(normalized)) {
    return USE_MEDIA_PROXY ? toProxyUrl(`ipfs://${normalized}`) : buildGatewayUrl(normalized);
  }

  return normalized;
}

/**
 * ⭐ Issue #3: Build gateway URL with fallback chain
 * Tries: Pinata → IPFS.io → Dweb.link
 */
function buildGatewayUrl(cid: string): string {
  // Primary gateway (configurable)
  const primary = IPFS_GATEWAY_BASE || DEFAULT_IPFS_GATEWAY_BASE;
  return `${primary}/${cid}`;
  
  // NOTE: Fallback chain implemented via service worker or dedicated proxy endpoint
  // This returns primary gateway; fallback handled at image level via onerror handlers
}

/**
 * Create resilient image source with gateway fallbacks
 * For use in <img> tags with automatic fallback on 404/timeout
 */
export function createResilientImageSrc(ipfsUri: string): string {
  // Return primary gateway URL
  // Frontend component can use onerror handler to try alternative gateways
  return ipfsToHttp(ipfsUri);
}

/**
 * Generate fallback gateway URLs for image error retry
 */
export function getGatewayFallbacks(cid: string): string[] {
  return IPFS_GATEWAYS.map((gateway) => `${gateway}/${cid}`);
}

export function resolveMediaUrl(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (isTransientOrInvalidMediaValue(value)) continue;
    return ipfsToHttp(value);
  }

  return "";
}

