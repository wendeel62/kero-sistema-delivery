// src/hooks/tracking.ts

export function initMetaPixel(pixelId: string) {
  // implementação futura
  console.log("Meta Pixel init:", pixelId);
}

export function trackMetaEvent(event: string, data?: object) {
  console.log("Meta event:", event, data);
}

export function initGA4(measurementId: string) {
  console.log("GA4 init:", measurementId);
}

export function trackGA4Event(event: string, data?: object) {
  console.log("GA4 event:", event, data);
}

export function initUTMfy(token: string) {
  console.log("UTMfy init:", token);
}

export function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(key => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  return utm;
}