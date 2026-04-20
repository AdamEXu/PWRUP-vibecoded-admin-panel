// src/lib/watchdogApi.ts - Purpose: typed client for Watchdog Flask API
export interface SystemStatusSuccess {
  status: "success";
  system_info: string;
  active_processes: string[];
  possible_processes: string[];
  config_set: boolean;
}

export interface SystemStatusError {
  status: "error";
  message: string;
}

export type SystemStatusResponse = SystemStatusSuccess | SystemStatusError;

async function handleJsonResponse<T>(res: Response): Promise<T> {
  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error(`Failed to parse response: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const errMsg =
      typeof (json as { message?: unknown })?.message === "string"
        ? (json as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json as T;
}

export async function getSystemStatus(
  baseUrl: string,
): Promise<SystemStatusSuccess> {
  // Use Next.js API route as proxy to avoid CORS issues
  const proxyUrl = `/api/watchdog/status?baseUrl=${encodeURIComponent(
    baseUrl,
  )}`;
  const res = await fetch(proxyUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await handleJsonResponse<SystemStatusResponse>(res);
  if (data.status !== "success") {
    throw new Error((data as SystemStatusError).message || "Unknown error");
  }
  return data;
}

export async function setConfig(
  baseUrl: string,
  config_base64: string,
): Promise<void> {
  const proxyUrl = `/api/watchdog/config?baseUrl=${encodeURIComponent(
    baseUrl,
  )}`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config_base64 }),
  });
  await handleJsonResponse<{ status: "success" }>(res);
}

export async function startProcesses(
  baseUrl: string,
  processTypes: string[],
): Promise<void> {
  const proxyUrl = `/api/watchdog/start?baseUrl=${encodeURIComponent(baseUrl)}`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ process_types: processTypes }),
  });
  await handleJsonResponse<{ status: "success" }>(res);
}

export async function stopProcesses(
  baseUrl: string,
  processTypes: string[],
): Promise<void> {
  const proxyUrl = `/api/watchdog/stop?baseUrl=${encodeURIComponent(baseUrl)}`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ process_types: processTypes }),
  });
  await handleJsonResponse<{ status: "success" }>(res);
}

export async function setProcesses(
  baseUrl: string,
  processes: string[],
): Promise<void> {
  const proxyUrl = `/api/watchdog/set-processes?baseUrl=${encodeURIComponent(
    baseUrl,
  )}`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ processes }),
  });
  await handleJsonResponse<{ status: "success" }>(res);
}
