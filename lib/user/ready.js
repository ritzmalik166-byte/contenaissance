export const onSiteReady = (cb) => {
  if (typeof window === 'undefined') return () => {};
  if (window.__siteReady) {
    cb();
    return () => {};
  }
  window.addEventListener('site:ready', cb, { once: true });
  return () => window.removeEventListener('site:ready', cb);
};

export const announceReady = () => {
  window.__siteReady = true;
  window.dispatchEvent(new Event('site:ready'));
};
