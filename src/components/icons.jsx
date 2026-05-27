const Ico = ({ d, size = 16, fill, stroke = 'currentColor', strokeWidth = 1.6, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'}
       stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
       {...rest}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const Icons = {
  Home:    (p) => <Ico {...p} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  Users:   (p) => <Ico {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.4-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M21.5 18c-.4-2.4-2.3-4-4.5-4"/></>} />,
  Chart:   (p) => <Ico {...p} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  Report:  (p) => <Ico {...p} d="M6 3h9l4 4v14H6zM14 3v5h5M8 13h8M8 17h6M8 9h3" />,
  Settings:(p) => <Ico {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} />,
  Bell:    (p) => <Ico {...p} d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 0 0 4 0" />,
  Search:  (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  Plus:    (p) => <Ico {...p} d="M12 5v14M5 12h14" />,
  Phone:   (p) => <Ico {...p} d="M22 17v3a2 2 0 0 1-2.2 2 19 19 0 0 1-8.3-3 19 19 0 0 1-6-6 19 19 0 0 1-3-8.3A2 2 0 0 1 4.5 2H7a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1l-1.1 1.1a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 17z" />,
  Mail:    (p) => <Ico {...p} d={<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>} />,
  Pin:     (p) => <Ico {...p} d={<><path d="M21 10c0 5-9 13-9 13s-9-8-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>} />,
  Check:   (p) => <Ico {...p} d="m4 12 5 5L20 6" />,
  X:       (p) => <Ico {...p} d="M6 6l12 12M18 6 6 18" />,
  Clock:   (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  Arrow:   (p) => <Ico {...p} d="M5 12h14M13 6l6 6-6 6" />,
  Chevron: (p) => <Ico {...p} d="m9 6 6 6-6 6" />,
  Filter:  (p) => <Ico {...p} d="M3 5h18l-7 8v7l-4-2v-5z" />,
  Dots:    (p) => <Ico {...p} d={<><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></>} />,
  Note:    (p) => <Ico {...p} d="M4 5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M8 12h8M8 16h6" />,
  Flag:    (p) => <Ico {...p} d="M4 21V4h13l-2 4 2 4H4" />,
  Building:(p) => <Ico {...p} d="M4 21V5l8-3 8 3v16M9 9h2M9 13h2M9 17h2M13 9h2M13 13h2M13 17h2" />,
  Trend:   (p) => <Ico {...p} d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  Menu:     (p) => <Ico {...p} d="M3 6h18M3 12h18M3 18h18" />,
  Calendar: (p) => <Ico {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />,
};
