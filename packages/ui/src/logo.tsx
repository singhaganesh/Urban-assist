'use client';
import * as React from 'react';
// @ts-ignore
import logoData from '../assets/logo.svg';

interface LogoProps {
  className?: string;
  inverted?: boolean;
}

export function Logo({ className = 'h-9 w-9', inverted = false }: LogoProps) {
  const src = typeof logoData === 'string' ? logoData : logoData.src;

  return (
    <img
      src={src}
      alt="Urban Assist"
      className={`${className} object-contain ${inverted ? 'brightness-0 invert' : ''}`}
    />
  );
}
