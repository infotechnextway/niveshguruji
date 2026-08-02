export const MASTER_DOWNLOAD_TIMEOUT_MS = 60_000;

/** Fetch a provider instrument master with a bounded wait and readable errors. */
export async function fetchMaster(
  url: string,
  init: RequestInit,
  label: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(MASTER_DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new Error(
        `${label} download timed out after ${MASTER_DOWNLOAD_TIMEOUT_MS / 1000}s — the file can be large; try again on a stable connection`,
      );
    }
    throw new Error(`Cannot reach ${label} (${url}): ${e.message}`);
  }
}
