import React from 'react';

export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Dark green background canopy */}
      <path d="M50,110 C30,110 30,70 50,60 C40,40 80,20 100,30 C120,5 170,15 170,50 C190,50 190,90 170,100 C180,120 140,140 120,130 C100,145 60,135 50,110 Z" fill="#2d8a43" />
      
      {/* Light green foreground canopy */}
      <path d="M60,115 C40,115 40,80 60,70 C50,55 85,40 105,50 C120,30 160,40 160,70 C175,70 175,105 160,115 C170,130 135,145 115,135 C100,145 70,135 60,115 Z" fill="#a0cd47" />

      {/* Yellow Sun */}
      <polygon points="105,75 110,85 125,85 115,95 120,110 105,100 90,110 95,95 85,85 100,85" fill="#fbeb25" />

      {/* Brown person/trunk */}
      {/* Base/Trunk */}
      <path d="M80,165 C85,150 90,135 95,120 C95,115 100,100 105,100 C110,100 115,115 115,120 C120,135 125,150 130,165 Q105,160 80,165 Z" fill="#8c5836" />
      {/* Left arm */}
      <path d="M100,105 L80,90 Z" fill="none" stroke="#8c5836" strokeWidth="8" strokeLinecap="round" />
      {/* Right arm */}
      <path d="M110,105 L130,90 Z" fill="none" stroke="#8c5836" strokeWidth="8" strokeLinecap="round" />
      {/* Head */}
      <path d="M102,100 C102,90 105,85 105,85 C105,85 108,90 108,100 Z" fill="#8c5836" />

      {/* Roots */}
      <path d="M65,120 Q55,140 60,155 M80,115 Q75,130 85,145 M135,115 Q140,130 135,145 M150,115 Q155,130 150,145" fill="none" stroke="#5cb85c" strokeWidth="2.5" />
    </svg>
  );
}
