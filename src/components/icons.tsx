// Filled, single-colour, solid-silhouette icons — no strokes, matching the
// corporate design system's iconography rules. ShareIcon and WorkflowIcon
// are the design system's own share.svg / hierarchy.svg path data; the rest
// are hand-drawn to match that same construction (see docs/design-system
// import in project history for the source).

type IconProps = { className?: string };

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5 2h9l6 6v14H5V2Zm9 0v6h6l-6-6Z" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 12c0-3.9 3.58-7 8-7s8 3.1 8 7-3.58 7-8 7c-1 0-1.95-.16-2.82-.46L4 20l1.2-3.6C4.44 15.4 4 13.76 4 12Z" />
    </svg>
  );
}

export function WorkflowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 31.2 31.2" fill="currentColor" className={className}>
      <path d="M 25.527 9.36 L 17.018 9.36 L 17.018 14.025 L 28.363 14.025 L 28.363 21.84 L 31.2 21.84 L 31.2 31.2 L 22.691 31.2 L 22.691 21.84 L 25.527 21.84 L 25.527 17.146 L 17.018 17.146 L 17.018 21.84 L 19.854 21.84 L 19.854 31.2 L 11.345 31.2 L 11.345 21.84 L 14.182 21.84 L 14.182 17.146 L 5.673 17.146 L 5.673 21.84 L 8.509 21.84 L 8.509 31.2 L 0 31.2 L 0 21.84 L 2.836 21.84 L 2.836 14.025 L 14.182 14.025 L 14.182 9.36 L 5.673 9.36 L 5.673 0 L 25.527 0 L 25.527 9.36 Z M 2.836 28.08 L 5.673 28.08 L 5.673 24.96 L 2.836 24.96 L 2.836 28.08 Z M 14.182 28.08 L 17.018 28.08 L 17.018 24.96 L 14.182 24.96 L 14.182 28.08 Z M 25.527 28.08 L 28.364 28.08 L 28.364 24.96 L 25.527 24.96 L 25.527 28.08 Z M 8.509 6.24 L 22.69 6.24 L 22.69 3.12 L 8.509 3.12 L 8.509 6.24 Z" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 19" fill="currentColor" className={className}>
      <path d="M 12.571 11.875 C 11.657 11.875 10.971 12.231 10.286 12.825 L 6.629 10.688 C 6.743 10.331 6.857 9.856 6.857 9.5 C 6.857 9.144 6.743 8.669 6.629 8.313 L 10.286 6.175 C 10.971 6.769 11.657 7.125 12.571 7.125 C 14.514 7.125 16 5.581 16 3.563 C 16 1.544 14.514 0 12.571 0 C 10.629 0 9.143 1.544 9.143 3.563 C 9.143 3.8 9.143 3.919 9.143 4.156 L 5.143 6.412 C 4.686 6.175 4.114 5.938 3.429 5.938 C 1.6 5.938 0 7.481 0 9.5 C 0 11.4 1.6 13.063 3.429 13.063 C 4.114 13.063 4.686 12.825 5.143 12.588 L 9.143 14.844 C 9.143 15.081 9.143 15.2 9.143 15.438 C 9.143 17.456 10.629 19 12.571 19 C 14.514 19 16 17.456 16 15.438 C 16 13.419 14.514 11.875 12.571 11.875 Z" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11 3h2v7h3l-4 5-4-5h3V3Z M5 19h14v2H5Z" />
    </svg>
  );
}

export function ReplyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11 5v4C6.5 9.5 4 12 3 17c2.5-3.5 5-4.5 8-4.5V16l8-5.5L11 5Z" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 16.2 4.8 12 3.4 13.4 9 19 20.6 7.4 19.2 6 9 16.2Z" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.3 5.71 12 12.01 5.7 5.71 4.29 7.12 10.59 13.41 4.29 19.71 5.7 21.12 12 14.82 18.3 21.12 19.71 19.71 13.41 13.41 19.71 7.12Z" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 5h4v14H6V5Z M14 5h4v14h-4V5Z" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 4l14 8-14 8V4Z" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 5h18v2H3V5Z M3 11h18v2H3v-2Z M3 17h18v2H3v-2Z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm1-16h-2v6.41l4.29 4.3 1.42-1.42L13 11.59V6Z" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
    </svg>
  );
}
