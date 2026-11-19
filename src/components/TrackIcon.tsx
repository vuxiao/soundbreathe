import React from 'react';
import type { TrackId } from '../config/site';

interface TrackIconProps {
  id: TrackId;
  className?: string;
}

export const TrackIcon: React.FC<TrackIconProps> = ({ id, className = 'h-5 w-5' }) => {
  switch (id) {
    case 'rain':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 13.5A4 4 0 0 1 7.2 5.6a5.5 5.5 0 0 1 10.4 1.6 3.5 3.5 0 0 1 .4 6.3" />
          <path d="M8.5 16.5v2.5" />
          <path d="M12 15.5v3.5" />
          <path d="M15.5 16.5v2.5" />
        </svg>
      );
    case 'ocean':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 10.5c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 4 2" />
          <path d="M2.5 15.5c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 4 2" />
          <path d="M6 19.5c1.8 0 2.5-1.2 4.5-1.2s2.7 1.2 4.5 1.2 2.5-1.2 3.5-1.2" opacity="0.6" />
        </svg>
      );
    case 'fire':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5c1.5 2.7 4.8 4.9 4.8 9.2a4.8 4.8 0 1 1-9.6 0c0-2 .9-3.9 2.2-5.3.2 1.4.9 2.2 1.8 2.5-.3-2.3.2-4.6.8-6.4Z" />
          <path d="M6.5 20.5h11" opacity="0.65" />
        </svg>
      );
    case 'crickets':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 4.5a6.5 6.5 0 1 0 4 11.4 5.2 5.2 0 0 1-4-11.4Z" />
          <path d="M17.5 6.5h2" />
          <path d="M18.5 5.5v2" />
          <path d="M4.5 19.5c2.5-1.5 5.2-1.5 7.5 0" opacity="0.65" />
          <path d="M6.5 16.5c1.5-.8 3-.8 4.5 0" opacity="0.5" />
        </svg>
      );
    case 'cosmos':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.2" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.4" transform="rotate(-24 12 12)" />
          <circle cx="18.8" cy="6.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'forest':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 9.5h11a2.5 2.5 0 1 0-2.5-2.5" />
          <path d="M3.5 14h14a2.5 2.5 0 1 1-2.5 2.5" />
          <path d="M5.5 18h6.5a2 2 0 1 1-2 2" opacity="0.65" />
        </svg>
      );
  }
};
