import { Severity, Vulnerability } from '../types/network';

interface NvdCveResponse {
  vulnerabilities?: Array<{
    cve?: {
      id?: string;
      published?: string;
      descriptions?: Array<{ lang?: string; value?: string }>;
      metrics?: {
        cvssMetricV31?: Array<{
          cvssData?: { baseScore?: number; baseSeverity?: string };
        }>;
        cvssMetricV30?: Array<{
          cvssData?: { baseScore?: number; baseSeverity?: string };
        }>;
        cvssMetricV2?: Array<{
          cvssData?: { baseScore?: number };
          baseSeverity?: string;
        }>;
      };
    };
  }>;
}

const memoryCache = new Map<string, Vulnerability>();

function normalizeSeverity(raw: string | undefined, score: number): Severity {
  const upper = (raw ?? '').toUpperCase();
  if (upper === 'CRITICAL' || score >= 9.0) return 'Critical';
  if (upper === 'HIGH' || score >= 7.0) return 'High';
  if (upper === 'MEDIUM' || score >= 4.0) return 'Medium';
  return 'Low';
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

export interface NvdSyncProgress {
  completed: number;
  total: number;
  currentCveId: string;
  liveCount: number;
  cachedCount: number;
}

export async function syncVulnerabilitiesFromNvd(
  currentVulns: Record<string, Vulnerability>,
  onProgress: (progress: NvdSyncProgress) => void,
  onCveUpdated: (cveId: string, updated: Vulnerability) => void,
  signal?: AbortSignal
): Promise<{ liveCount: number; cachedCount: number; timestamp: string }> {
  const cveIds = Object.keys(currentVulns);
  const total = cveIds.length;
  let liveCount = 0;
  let cachedCount = 0;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;
    const cveId = cveIds[i];
    const baseVuln = currentVulns[cveId];

    onProgress({
      completed: i,
      total,
      currentCveId: cveId,
      liveCount,
      cachedCount,
    });

    // Check in-memory cache first for previously fetched live records
    const cached = memoryCache.get(cveId);
    if (cached && cached.nvdStatus === 'live') {
      liveCount++;
      onCveUpdated(cveId, cached);
      onProgress({
        completed: i + 1,
        total,
        currentCveId: cveId,
        liveCount,
        cachedCount,
      });
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as NvdCveResponse;
      const cveItem = data.vulnerabilities?.[0]?.cve;
      if (!cveItem) {
        throw new Error('Empty NVD payload');
      }

      const m31 = cveItem.metrics?.cvssMetricV31?.[0]?.cvssData;
      const m30 = cveItem.metrics?.cvssMetricV30?.[0]?.cvssData;
      const m2 = cveItem.metrics?.cvssMetricV2?.[0];

      const cvss =
        m31?.baseScore ??
        m30?.baseScore ??
        m2?.cvssData?.baseScore ??
        baseVuln.cvss;
      const rawSeverity = m31?.baseSeverity ?? m30?.baseSeverity ?? m2?.baseSeverity;
      const severity = normalizeSeverity(rawSeverity, cvss);

      const enDesc =
        cveItem.descriptions?.find((d) => d.lang === 'en')?.value ??
        baseVuln.description;
      const publishedDate = cveItem.published
        ? cveItem.published.slice(0, 10)
        : baseVuln.publishedDate;

      const updated: Vulnerability = {
        ...baseVuln,
        cvss,
        severity,
        description: enDesc,
        publishedDate,
        nvdStatus: 'live',
      };

      memoryCache.set(cveId, updated);
      liveCount++;
      onCveUpdated(cveId, updated);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError' && signal?.aborted) {
        break;
      }
      // Graceful silent fallback to embedded dataset
      const fallback: Vulnerability = {
        ...baseVuln,
        nvdStatus: 'cached',
      };
      cachedCount++;
      onCveUpdated(cveId, fallback);
    }

    onProgress({
      completed: i + 1,
      total,
      currentCveId: cveId,
      liveCount,
      cachedCount,
    });

    if (i < total - 1 && !signal?.aborted) {
      try {
        await sleep(700, signal);
      } catch {
        break;
      }
    }
  }

  return {
    liveCount,
    cachedCount,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
