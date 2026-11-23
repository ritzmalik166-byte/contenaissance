'use client';

/* Registry so portfolio sections can talk to the portfolio WebGL
   scene (components/portfolio/PortfolioCanvas.jsx) without prop
   drilling. Callers optional-chain every call, so sections keep
   working when the scene is absent (reduced motion, before load). */

let current = null;

export const setPortfolioScene = (s) => {
  current = s;
};

export const getPortfolioScene = () => current;
