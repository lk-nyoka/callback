// Minimal line icons (24px grid, 1.7 stroke), drawn for Callback.
type P = { className?: string; size?: number };

function I({ d, className = "", size = 18, children }: P & { d?: string; children?: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const IconHome = (p: P) => <I {...p} d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" />;
export const IconVault = (p: P) => (
  <I {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </I>
);
export const IconBriefcase = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" />
  </I>
);
export const IconDoc = (p: P) => (
  <I {...p}>
    <path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" />
  </I>
);
export const IconMoon = (p: P) => <I {...p} d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />;
export const IconLock = (p: P) => (
  <I {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </I>
);
export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </I>
);
export const IconUpload = (p: P) => <I {...p} d="M12 15.5V4.5m0 0-4 4m4-4 4 4M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />;
export const IconSpark = (p: P) => <I {...p} d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5zM18.5 15.5c.3 1.6 1.1 2.4 2.5 2.7-1.4.3-2.2 1.1-2.5 2.7-.3-1.6-1.1-2.4-2.5-2.7 1.4-.3 2.2-1.1 2.5-2.7z" />;
export const IconCheck = (p: P) => <I {...p} d="m5 12.5 4.5 4.5L19 7.5" />;
export const IconX = (p: P) => <I {...p} d="M6.5 6.5l11 11m0-11-11 11" />;
export const IconArrow = (p: P) => <I {...p} d="M5 12h14m-5-5 5 5-5 5" />;
export const IconChevron = (p: P) => <I {...p} d="m9.5 6 6 6-6 6" />;
export const IconBack = (p: P) => <I {...p} d="m14.5 6-6 6 6 6" />;
export const IconRefresh = (p: P) => <I {...p} d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />;
export const IconDownload = (p: P) => <I {...p} d="M12 4.5v11m0 0 4-4m-4 4-4-4M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17" />;
export const IconCopy = (p: P) => (
  <I {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
  </I>
);
export const IconPin = (p: P) => (
  <I {...p}>
    <path d="M12 20.5s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </I>
);
export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </I>
);
export const IconBolt = (p: P) => <I {...p} d="M13 3.5 5.5 13.5H11l-1 7 7.5-10H12z" />;
export const IconEye = (p: P) => (
  <I {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </I>
);
export const IconLayers = (p: P) => <I {...p} d="M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />;
export const IconPlus = (p: P) => <I {...p} d="M12 5v14M5 12h14" />;
export const IconEdit = (p: P) => <I {...p} d="M14.5 5.5l4 4L9 19H5v-4zM12.5 7.5l4 4" />;
export const IconTrash = (p: P) => <I {...p} d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" />;
export const IconLink = (p: P) => <I {...p} d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />;
export const IconChart = (p: P) => <I {...p} d="M4.5 19.5h15M7.5 16v-4M12 16V8M16.5 16v-6" />;
