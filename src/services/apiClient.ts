/**
 * API Client Interceptor
 * Automatically attaches Regional Jurisdiction Headers (X-Region-Id, X-Region-State, X-Region-District)
 * to every HTTP request across the application.
 */

export function setupRegionalApiInterceptor(): void {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const regionId = localStorage.getItem('civic_region_id') || 'ap-guntur';
    const regionState = localStorage.getItem('civic_region_state') || 'Andhra Pradesh';
    const regionDistrict = localStorage.getItem('civic_region_district') || 'Guntur';

    const headers = new Headers(init?.headers || {});
    if (!headers.has('X-Region-Id')) headers.set('X-Region-Id', regionId);
    if (!headers.has('X-Region-State')) headers.set('X-Region-State', regionState);
    if (!headers.has('X-Region-District')) headers.set('X-Region-District', regionDistrict);

    return originalFetch(input, {
      ...init,
      headers,
    });
  };
}
