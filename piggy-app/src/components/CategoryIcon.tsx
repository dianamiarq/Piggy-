import React from 'react';

/** Line icons for categories, drawn on a 24px grid. */
const PATHS: Record<string, React.ReactNode> = {
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></>,
  cart: <><path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.6" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></>,
  cup: <><path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 3.5c0 1 1 1.3 1 2.3M12 3.5c0 1 1 1.3 1 2.3" /></>,
  metro: <><rect x="6" y="3.5" width="12" height="13" rx="3" /><path d="M6 11h12" /><circle cx="9" cy="13.8" r=".9" fill="currentColor" /><circle cx="15" cy="13.8" r=".9" fill="currentColor" /><path d="m8 20 1.5-3.5M16 20l-1.5-3.5" /></>,
  plane: <><path d="M10.5 13.5 4 11l1.2-1.6 7 1.1 4.6-5.4a1.8 1.8 0 0 1 2.6 2.6l-5.4 4.6 1.1 7-1.6 1.2-2.5-6.5" /><path d="m7 17-3 .5L5 15" /></>,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  health: <><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /><path d="M9 12h1.8l1-2 1.6 4 1-2H15" /></>,
  dumbbell: <><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  suitcase: <><rect x="4" y="7.5" width="16" height="12" rx="2" /><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M9 7.5v12M15 7.5v12" /></>,
  ticket: <><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M14 7v2M14 11.5v1M14 15v2" /></>,
  repeat: <><path d="m17 2.5 3.5 3.5L17 9.5" /><path d="M4 11.5v-1A4.5 4.5 0 0 1 8.5 6h12" /><path d="m7 21.5-3.5-3.5L7 14.5" /><path d="M20 12.5v1a4.5 4.5 0 0 1-4.5 4.5h-12" /></>,
  dots: <><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></>,
  briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17" /></>,
  coins: <><ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" /><path d="M10 15.6c.9.6 2.3.9 4 .9 2.8 0 5-1.1 5-2.5v-4c0-1.2-1.6-2.2-3.8-2.4" /><path d="M10 15.6V18c.9.6 2.3 1 4 1 2.8 0 5-1.1 5-2.5v-2.5" /></>,
  car: <><path d="M5 16.5V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v4.5" /><path d="M4 12h16v4.5H4z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="16.5" cy="18" r="1.5" /></>,
  bolt: <path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z" />,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3.5 9h17M12 9v11" /><path d="M12 9c-1.5-3.5-5.5-3.8-5.5-1.5S12 9 12 9zM12 9c1.5-3.5 5.5-3.8 5.5-1.5S12 9 12 9z" /></>,
  paw: <><circle cx="7" cy="9.5" r="1.6" /><circle cx="10.5" cy="6.5" r="1.6" /><circle cx="14.5" cy="6.5" r="1.6" /><circle cx="18" cy="9.5" r="1.6" /><path d="M12.5 11c-2.5 0-5 3.6-5 6a2.5 2.5 0 0 0 3.2 2.4c1.2-.4 2.4-.4 3.6 0A2.5 2.5 0 0 0 17.5 17c0-2.4-2.5-6-5-6z" /></>,
  book: <><path d="M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" /><path d="M5 16.5a3 3 0 0 1 3-3h10" /></>,
  palette: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-1 1.3-2.1-.6-1.2.2-2.4 1.5-2.4H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z" /><circle cx="8" cy="11" r="1" fill="currentColor" /><circle cx="11" cy="7.5" r="1" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1" fill="currentColor" /></>,
  shirt: <path d="m8.5 4-4.5 2.5 1.5 4H8V20h8v-9.5h2.5l1.5-4L15.5 4c-.5 1.5-1.8 2.5-3.5 2.5S9 5.5 8.5 4z" />,
  music: <><path d="M9 18V5.5l10-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  study: <><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z" /><path d="M6.5 11v4.5c1.5 1.3 3.5 2 5.5 2s4-.7 5.5-2V11M21.5 9v5" /></>,
  wine: <><path d="M7.5 3.5h9l-.5 5a4 4 0 0 1-8 0z" /><path d="M12 12.5V20M8.5 20h7" /></>,
  baby: <><circle cx="12" cy="12" r="8.5" /><circle cx="9.3" cy="11" r=".9" fill="currentColor" /><circle cx="14.7" cy="11" r=".9" fill="currentColor" /><path d="M9.5 14.5c1.4 1.2 3.6 1.2 5 0M12 3.5c-1.2 1.2-.8 2.6.6 2.6" /></>,
  plant: <><path d="M12 20v-8" /><path d="M12 12c0-4 2.5-6.5 7-7 0 4.5-2.5 7-7 7zM12 14c0-3-2-5-6-5.5.1 3.7 2.1 5.5 6 5.5z" /><path d="M7.5 20h9" /></>,
  scissors: <><circle cx="6.5" cy="7" r="2.5" /><circle cx="6.5" cy="17" r="2.5" /><path d="M8.6 8.4 19.5 17M8.6 15.6 19.5 7" /></>,
  tag: <><path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5z" /><circle cx="8" cy="8" r="1.3" /></>,
};

export const ICON_CHOICES = Object.keys(PATHS);

export const CategoryIcon: React.FC<{ name?: string; size?: number; className?: string }> = ({ name, size = 22, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {PATHS[name ?? 'tag'] ?? PATHS.tag}
  </svg>
);
