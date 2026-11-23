/**
 * Centralized Azure video assets.
 *
 * Single source of truth for every showreel/portfolio MP4 hosted in the
 * `ct-assets` Azure Blob container. Not yet wired into any component —
 * existing references are unchanged.
 *
 * Filenames are kept EXACTLY as stored in Azure (blob names are
 * case-sensitive: `02.MP4` ≠ `02.mp4`). Each name is URL-encoded, so
 * spaces become `%20`. All URLs verified to return 200 on 2026-11-23.
 */

export const AZURE_VIDEO_BASE_URL =
  'https://contenaissance.blob.core.windows.net/ct-assets';

/** Build an Azure URL from an exact blob filename (encodes spaces etc.). */
const azureVideo = (fileName) => ({
  fileName,
  url: `${AZURE_VIDEO_BASE_URL}/${encodeURIComponent(fileName)}`,
});

export const VIDEO_ASSETS = Object.freeze({
  video01: azureVideo('01.mp4'),
  video02: azureVideo('02.MP4'),
  video03: azureVideo('03.mp4'),
  video04: azureVideo('04.mp4'),
  video05: azureVideo('05.MP4'),
  video06: azureVideo('06.mp4'),
  video07: azureVideo('07.mp4'),
  video08: azureVideo('08.MP4'),
  video09: azureVideo('09.mp4'),
  video10: azureVideo('10.mp4'),
  video11: azureVideo('11.mp4'),
  video12: azureVideo('12.mp4'),
  video13: azureVideo('13.mp4'),
  video14: azureVideo('14.mp4'),
  video15: azureVideo('15.mp4'),
  automotive: azureVideo('auto.mp4'),
  showreel: azureVideo('Mzha Nhi Aaya-02.1.mp4'),
});

/** Convenience map: key → URL string. */
export const VIDEO_URLS = Object.freeze(
  Object.fromEntries(
    Object.entries(VIDEO_ASSETS).map(([key, { url }]) => [key, url])
  )
);

/** Look up a URL by key, e.g. `getVideoUrl('showreel')`. */
export const getVideoUrl = (key) => VIDEO_ASSETS[key]?.url ?? null;
