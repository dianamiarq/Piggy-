import React from 'react';

type P = React.SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true };

export const IconHome = (p: P) => (
  <svg {...base} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
);
export const IconList = (p: P) => (
  <svg {...base} {...p}><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base} {...p}><path d="M4 20h16" /><rect x="5.5" y="11" width="3" height="6.5" rx="1" /><rect x="10.5" y="6" width="3" height="11.5" rx="1" /><rect x="15.5" y="13" width="3" height="4.5" rx="1" /></svg>
);
export const IconGear = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChevL = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><path d="m15 18-6-6 6-6" /></svg>);
export const IconChevR = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><path d="m9 18 6-6-6-6" /></svg>);
export const IconSearch = (p: P) => (<svg {...base} strokeWidth={2} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>);
export const IconX = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconAlert = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9.5v4M12 17h.01" /></svg>);
export const IconHouse = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>);
export const IconRepeat = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>);
export const IconArrowUp = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>);
export const IconArrowDown = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>);
export const IconChevDown = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="m6 9 6 6 6-6" /></svg>);
export const IconLock = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
export const IconBulb = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" /></svg>);
