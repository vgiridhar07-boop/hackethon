import { HelplineEndpoint } from '../types';

export function normalizeCallableUri(rawNumber: string | null | undefined): string {
  if (!rawNumber) return 'tel:112';
  const digits = rawNumber.replace(/[^0-9+]/g, '');
  if (!digits) return 'tel:112';

  // Short-codes (112, 14420, 1915, 1969, 181, 1902) must not have +91 prefix
  if (digits.length <= 5) {
    return `tel:${digits}`;
  }
  if (digits.startsWith('1800')) {
    return `tel:${digits}`;
  }
  if (digits.startsWith('+91')) {
    return `tel:${digits}`;
  }
  return `tel:+91${digits.replace(/^0+/, '')}`;
}

export function executeOneTapCall(
  endpoint: HelplineEndpoint,
  options?: { forceFallback?: boolean; onFallbackNotice?: (message: string) => void }
): void {
  const forceFallback = options?.forceFallback || false;
  const isPrimaryValid =
    !forceFallback &&
    endpoint.callable_uri &&
    endpoint.primary_phone_raw &&
    !endpoint.primary_phone_raw.includes('xxxx');

  if (isPrimaryValid) {
    window.location.href = endpoint.callable_uri!;
  } else {
    // Notify citizen of automatic nodal failover routing
    if (options?.onFallbackNotice) {
      options.onFallbackNotice(
        `Local direct desk line is unverified or offline. Auto-routing to Apex Nodal Helpline: ${endpoint.fallback_phone_raw}`
      );
    }
    window.location.href = endpoint.fallback_callable_uri || 'tel:112';
  }
}

