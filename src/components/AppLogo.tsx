import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export default function AppLogo({ className = "w-10 h-10", size }: AppLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
      style={style}
    >
      <defs>
        {/* Main logo gradient - vibrant green to emerald dark */}
        <linearGradient id="logoPrimaryGrad" x1="120" y1="120" x2="380" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#86FF2E" />
          <stop offset="35%" stopColor="#46F04C" />
          <stop offset="70%" stopColor="#0FB154" />
          <stop offset="100%" stopColor="#028A3E" />
        </linearGradient>

        {/* 3D fold shading gradient to create the inner pocket transition */}
        <linearGradient id="logoFoldShade" x1="220" y1="280" x2="360" y2="390" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#013A1C" stopOpacity="0" />
          <stop offset="50%" stopColor="#013A1C" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#012411" stopOpacity="0.85" />
        </linearGradient>

        {/* High-fidelity drop shadow for 3D realism */}
        <filter id="logoShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#01180A" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Main Logo Container with Shadow */}
      <g filter="url(#logoShadow)">
        {/* Left wing and apex - smoothly curving from bottom-left round end up to the round top point */}
        <path 
          d="M 145,360
             C 125,360 115,345 125,320
             L 225,125
             C 235,105 265,105 275,125
             L 375,320
             C 385,345 375,360 355,360
             C 330,360 300,325 250,285
             C 200,325 170,360 145,360 Z" 
          fill="url(#logoPrimaryGrad)" 
        />

        {/* 3D Ribbon Fold: sweeping overlay on the bottom right wing */}
        <path 
          d="M 250,285
             C 300,325 330,360 355,360
             C 375,360 385,345 375,320
             L 305,183
             C 292,205 268,245 250,285 Z" 
          fill="url(#logoPrimaryGrad)" 
        />

        {/* Shadow overlay to separate the ribbon folding layers */}
        <path 
          d="M 250,285
             C 300,325 330,360 355,360
             C 355,360 310,340 250,285 Z" 
          fill="url(#logoFoldShade)" 
        />
      </g>
    </svg>
  );
}
