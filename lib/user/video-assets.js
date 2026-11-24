/**
 * Centralized video assets: Azure MP4 + its local poster image.
 *
 * Single source of truth for every showreel/portfolio MP4 hosted in the
 * `ct-assets` Azure Blob container, paired with the poster frame shown
 * before / while the video loads (served from `public/posters`).
 *
 * Filenames are kept EXACTLY as stored (blob names are case-sensitive:
 * `02.MP4` ≠ `02.mp4`). Each name is URL-encoded, so spaces become
 * `%20`. All video URLs verified to return 200 on 2026-11-23.
 */

export const AZURE_VIDEO_BASE_URL =
  'https://contenaissance.blob.core.windows.net/ct-assets';

export const POSTER_BASE_URL = '/posters';

/** Local poster URL from an exact filename in `public/posters`. */
export const posterPath = (fileName) =>
  `${POSTER_BASE_URL}/${encodeURIComponent(fileName)}`;

/** Video (Azure blob filename) + poster (`public/posters` filename). */
const asset = (fileName, posterFile) => ({
  fileName,
  url: `${AZURE_VIDEO_BASE_URL}/${encodeURIComponent(fileName)}`,
  posterFile,
  poster: posterPath(posterFile),
});

export const VIDEO_ASSETS = Object.freeze({
  video01: asset('01.mp4', '01.webp'),
  video02: asset('02.MP4', '02.webp'),
  video03: asset('03.mp4', '03.webp'),
  video04: asset('04.mp4', '04.webp'),
  video05: asset('05.MP4', '05.webp'),
  video06: asset('06.mp4', '06.webp'),
  video07: asset('07.mp4', '07.webp'),
  video08: asset('08.MP4', '08.webp'),
  video09: asset('09.mp4', '09.webp'),
  video10: asset('10.mp4', '10.webp'),
  video11: asset('11.mp4', '11.webp'),
  video12: asset('12.mp4', '12.webp'),
  video13: asset('13.mp4', '13.webp'),
  video14: asset('14.mp4', '14.webp'),
  video15: asset('15.mp4', '15.webp'),
  automotive: asset('auto.mp4', 'auto.webp'),
  showreel: asset('Mzha Nhi Aaya-02.1.mp4', 'Mzha Nhi Aaya-02.1.webp'),
});

/** Convenience map: key → video URL string. */
export const VIDEO_URLS = Object.freeze(
  Object.fromEntries(
    Object.entries(VIDEO_ASSETS).map(([key, { url }]) => [key, url])
  )
);

/** Convenience map: key → poster URL string. */
export const POSTER_URLS = Object.freeze(
  Object.fromEntries(
    Object.entries(VIDEO_ASSETS).map(([key, { poster }]) => [key, poster])
  )
);

/** Look up a video URL by key, e.g. `getVideoUrl('showreel')`. */
export const getVideoUrl = (key) => VIDEO_ASSETS[key]?.url ?? null;

/** Look up a poster URL by key, e.g. `getPosterUrl('showreel')`. */
export const getPosterUrl = (key) => VIDEO_ASSETS[key]?.poster ?? null;
