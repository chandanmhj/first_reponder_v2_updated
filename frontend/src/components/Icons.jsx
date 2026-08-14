const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ children, size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </Svg>
);

export const PlateIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
  </Svg>
);

export const HeartPulseIcon = (p) => (
  <Svg {...p}>
    <path d="M20.5 8.5c0-2.5-2-4.5-4.5-4.5-1.6 0-3 .8-3.9 2.1L12 6.4l-.1-.3C11 4.8 9.6 4 8 4 5.5 4 3.5 6 3.5 8.5c0 4.5 5 8 8.5 11 3.5-3 8.5-6.5 8.5-11Z" />
    <path d="M4.5 12h3l1.5-3 2 5 1.5-3h6" />
  </Svg>
);

export const UserIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
  </Svg>
);

export const CameraIcon = (p) => (
  <Svg {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Svg>
);

export const GalleryIcon = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m5 17 4.5-5 3 3.2L16 11l3.5 6" />
  </Svg>
);

export const BackIcon = (p) => (
  <Svg {...p}>
    <path d="M15 5 8 12l7 7" />
  </Svg>
);

export const SendIcon = (p) => (
  <Svg {...p}>
    <path d="M4.5 12 20 4.5l-4 15-5-5.5-6-2Z" />
  </Svg>
);

export const PhoneIcon = (p) => (
  <Svg {...p}>
    <path d="M5.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L15 13l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4Z" />
  </Svg>
);

export const PinIcon = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}>
    <path d="M5 12.5 9.5 17 19 7" />
  </Svg>
);

export const AlertIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4 21 19H3Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.6" r="0.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 .8 12a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L16 7" />
  </Svg>
);

export const ImageIcon = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m5 17 4.5-5 3 3.2L16 11l3.5 6" />
  </Svg>
);

export const ShieldCheckIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6Z" />
    <path d="m8.5 12 2.3 2.3L15.5 9.5" />
  </Svg>
);

export const TagIcon = (p) => (
  <Svg {...p}>
    <path d="M11 4h6a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-.44 1.06l-7 7a1.5 1.5 0 0 1-2.12 0l-5-5a1.5 1.5 0 0 1 0-2.12l7-7A1.5 1.5 0 0 1 11 4Z" />
    <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const ChevronRightIcon = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Svg>
);

export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 3.5l17 17" />
    <path d="M9.9 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.3 4.1M6.3 7.3A15 15 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6" />
    <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
  </Svg>
);
