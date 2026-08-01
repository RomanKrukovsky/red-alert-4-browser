import React from 'react';

export type IconName =
  | 'star'
  | 'globe'
  | 'crossed'
  | 'book'
  | 'gear'
  | 'exit'
  | 'credits'
  | 'power'
  | 'cap'
  | 'shield'
  | 'target'
  | 'repair'
  | 'sell'
  | 'stop'
  | 'back'
  | 'play';

const paths: Record<IconName, React.ReactNode> = {
  star: <path d="m12 2 2.8 6.1 6.7.7-5 4.6 1.4 6.6-5.9-3.4L6.1 20l1.4-6.6-5-4.6 6.7-.7L12 2Z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.1 3 14.9 0 18M12 3c-3 3.1-3 14.9 0 18" /></>,
  crossed: <path d="m5 3 16 16-2 2L3 5l2-2Zm14 0 2 2-6.4 6.4-2-2L19 3ZM3 19l6.4-6.4 2 2L5 21l-2-2Z" />,
  book: <path d="M3 4.5c3.8-.8 6.8.1 9 2.3v13c-2.2-2.2-5.2-3.1-9-2.3v-13Zm18 0c-3.8-.8-6.8.1-9 2.3v13c2.2-2.2 5.2-3.1 9-2.3v-13Z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="m10 2 .6 2.1h2.8L14 2l2.5 1.1-.9 2 2 2 .9-1.9L21 7.8l-2 1v2.8l2 1-.9 2.7-2.1-.8-2 2 .9 2-2.7 1.1-.8-2h-2.8l-.8 2-2.7-1.1.9-2-2-2-2.1.8L3 12.6l2-1V8.8l-2-1 1.5-2.6.9 1.9 2-2-.9-2L10 2Z" /></>,
  exit: <path d="M10 4H4v16h6M14 8l4 4-4 4m4-4H8" />,
  credits: <path d="M4 7h16v10H4zM8 7V5h8v2M7 12h10" />,
  power: <path d="m13 2-8 12h6l-1 8 9-13h-6V2Z" />,
  cap: <path d="M4 18V8l8-5 8 5v10l-8 3-8-3Zm8-15v18M4 8l8 4 8-4" />,
  shield: <path d="M12 2 4 5v6c0 5.2 3.3 8.7 8 11 4.7-2.3 8-5.8 8-11V5l-8-3Z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 1v5m0 12v5M1 12h5m12 0h5" /></>,
  repair: <path d="m14 5 5-3 3 3-3 5-3-3-8 8 2 2-4 4-3-3 4-4 2 2 8-8-3-3Z" />,
  sell: <path d="M4 7h16v13H4zM8 7V4h8v3M12 10v7m3-5.5c0-1-1.3-1.5-3-1.5s-3 .5-3 1.5 1.3 1.5 3 1.5 3 .5 3 1.5-1.3 1.5-3 1.5-3-.5-3-1.5" />,
  stop: <path d="M7 3h10l4 4v10l-4 4H7l-4-4V7l4-4Z" />,
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
  play: <path d="m8 4 12 8-12 8V4Z" />,
};

export const RA4Icon: React.FC<{ name: IconName; size?: number; label?: string }> = ({ name, size = 22, label }) => (
  <svg className="ra4-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} aria-label={label}>
    {paths[name]}
  </svg>
);

export const Emblem: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`ra4-emblem${compact ? ' is-compact' : ''}`} aria-hidden="true">
    <span className="ra4-emblem-ring" />
    <RA4Icon name="star" size={compact ? 34 : 92} />
  </div>
);

export const MetalPanel: React.FC<React.HTMLAttributes<HTMLDivElement> & { title?: string }> = ({ className = '', title, children, ...props }) => (
  <div className={`ra4-metal-panel ${className}`} {...props}>
    <span className="ra4-corner ra4-corner-tl" />
    <span className="ra4-corner ra4-corner-br" />
    {title && <div className="ra4-panel-title" role="heading" aria-level={2}>{title}</div>}
    {children}
  </div>
);

export const MilitaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; tone?: 'primary' | 'quiet' | 'disabled' }> = ({ className = '', icon, tone = 'quiet', children, disabled, ...props }) => (
  <button className={`ra4-military-button is-${tone} ${className}`} disabled={disabled || tone === 'disabled'} {...props}>
    {icon && <RA4Icon name={icon} size={21} />}
    <span>{children}</span>
  </button>
);

export const Resource: React.FC<{ icon: IconName; value: string; warning?: boolean; label: string }> = ({ icon, value, warning, label }) => (
  <div className={`ra4-resource${warning ? ' is-warning' : ''}`} aria-label={`${label}: ${value}`}>
    <RA4Icon name={icon} size={17} />
    <span>{value}</span>
  </div>
);
