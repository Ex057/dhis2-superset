/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { styled, t, useTheme, SupersetClient } from '@superset-ui/core';
import { Button, Loading } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import logoImage from 'src/assets/images/loog.jpg';
import DashboardContentArea from 'src/features/home/DashboardContentArea';
import ConfigurableSidebar, { type Dashboard } from './ConfigurableSidebar';
import { usePublicPageConfig } from './usePublicPageConfig';
import { PublicPageLayoutConfig } from './config';

const NAV_MENU_HEIGHT = 44;

type PublicPageTheme = 'light' | 'dark';
type PublicPageSidebarLayout = 'side' | 'top';

const PUBLIC_PAGE_THEME_STORAGE_KEY = 'superset.publicLandingPage.theme';
const PUBLIC_PAGE_SIDEBAR_LAYOUT_STORAGE_KEY =
  'superset.publicLandingPage.sidebarLayout';

const getStoredTheme = (): PublicPageTheme => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const storedTheme = window.localStorage.getItem(
      PUBLIC_PAGE_THEME_STORAGE_KEY,
    );
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
  } catch (error) {
    console.warn('Unable to read public page theme preference', error);
  }

  return 'light';
};

const storeThemePreference = (theme: PublicPageTheme) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_PAGE_THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to store public page theme preference', error);
  }
};

const getStoredSidebarLayout = (): PublicPageSidebarLayout | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedLayout = window.localStorage.getItem(
      PUBLIC_PAGE_SIDEBAR_LAYOUT_STORAGE_KEY,
    );
    if (storedLayout === 'side' || storedLayout === 'top') {
      return storedLayout;
    }
  } catch (error) {
    console.warn('Unable to read public page sidebar layout preference', error);
  }

  return null;
};

const storeSidebarLayoutPreference = (layout: PublicPageSidebarLayout) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_PAGE_SIDEBAR_LAYOUT_STORAGE_KEY, layout);
  } catch (error) {
    console.warn(
      'Unable to store public page sidebar layout preference',
      error,
    );
  }
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Dynamic styled components that accept configuration
const PageWrapper = styled.div<{ $customCss?: string }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--public-page-page-background, white);
  color: var(--public-page-text-color, inherit);
  z-index: 9999;
  overflow-y: auto;
  ${({ $customCss }) => $customCss || ''}
`;

const PublicNavbar = styled.div<{
  $height: number;
  $backgroundColor: string;
  $boxShadow: string;
}>`
  background: ${({ $backgroundColor }) =>
    `var(--public-page-navbar-background, ${$backgroundColor})`};
  box-shadow: ${({ $boxShadow }) =>
    `var(--public-page-navbar-shadow, ${$boxShadow})`};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 101;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${({ $height }) => $height}px;
  padding: 0 24px;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoImage = styled.img<{ $height: number }>`
  height: ${({ $height }) => $height}px;
  width: auto;
`;

const LogoText = styled.div<{
  $fontSize: string;
  $fontWeight: number;
  $color: string;
}>`
  font-size: ${({ $fontSize }) => $fontSize};
  font-weight: ${({ $fontWeight }) => $fontWeight};
  color: ${({ $color }) => $color};
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;


const ContentWrapper = styled.div<{
  $navbarHeight: number;
  $sidebarWidth: number;
  $sidebarPosition: string;
  $sidebarEnabled: boolean;
  $sidebarLayout: PublicPageSidebarLayout;
  $backgroundColor: string;
  $padding: string;
  $mobileBreakpoint: number;
}>`
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - ${({ $navbarHeight }) => $navbarHeight}px);
  position: relative;
  padding-top: ${({ $navbarHeight }) => $navbarHeight}px;
  background: ${({ $backgroundColor }) =>
    `var(--public-page-content-background, ${$backgroundColor})`};

  ${({ $sidebarEnabled, $sidebarWidth, $sidebarPosition, $sidebarLayout }) =>
    $sidebarEnabled
      ? $sidebarLayout === 'top'
        ? `
          width: 100%;
        `
        : $sidebarPosition === 'left'
          ? `
          margin-left: ${$sidebarWidth}px;
          width: calc(100% - ${$sidebarWidth}px);
        `
          : `
          margin-right: ${$sidebarWidth}px;
          width: calc(100% - ${$sidebarWidth}px);
        `
      : 'width: 100%;'}

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    margin-left: 0;
    margin-right: 0;
    width: 100%;
  }
`;

/* ── Hero Section ── */
const HeroSection = styled.section`
  background: var(--public-page-hero-bg, linear-gradient(160deg, #f0f7f4 0%, #eaf4f8 100%));
  padding: 64px 48px 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 40px 24px;
    text-align: center;
  }
`;

const HeroContent = styled.div`
  max-width: 580px;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(43, 106, 106, 0.08);
  border: 1px solid rgba(43, 106, 106, 0.2);
  color: #2b6a6a;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 20px;
`;

const HeroTitle = styled.h1`
  font-size: 38px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.8px;
  color: var(--public-page-heading-color, #1e2d45);
  margin: 0 0 16px;
  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 16px;
  line-height: 1.65;
  color: var(--public-page-text-secondary-color, #4b5563);
  margin: 0 0 32px;
  max-width: 500px;
`;

const HeroCTARow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeroCtaPrimary = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 24px;
  background: #2b6a6a;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s ease;
  &:hover {
    background: #245858;
    color: #ffffff;
    text-decoration: none;
  }
`;

const HeroCtaSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 20px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
  &:hover {
    border-color: #9ca3af;
    background: #f9fafb;
    color: #374151;
    text-decoration: none;
  }
`;

const HeroVisual = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 200px;
  background: rgba(43, 106, 106, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(43, 106, 106, 0.12);
  @media (max-width: 768px) {
    display: none;
  }
`;

const HeroVisualInner = styled.div`
  text-align: center;
  color: #2b6a6a;
`;

const HeroVisualIcon = styled.div`
  font-size: 56px;
  margin-bottom: 8px;
  opacity: 0.7;
`;

const HeroVisualLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #2b6a6a;
  opacity: 0.8;
`;

/* ── KPI Band ── */
const KPIBand = styled.div`
  background: var(--public-page-kpi-bg, #ffffff);
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 48px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 24px;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled.div<{ $color: string }>`
  padding: 24px 20px;
  border-right: 1px solid #e5e7eb;
  &:last-child {
    border-right: none;
  }
  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
`;

const KPICardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const KPILabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #6b7280;
`;

const KPIBadge = styled.div<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
  letter-spacing: 0.2px;
`;

const KPIValue = styled.div`
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #1e2d45;
  line-height: 1;
  margin-bottom: 6px;
`;

const KPISubtext = styled.div`
  font-size: 12px;
  color: #9ca3af;
`;

/* ── Program content sections ── */
const ProgramSection = styled.section`
  padding: 56px 48px;
  @media (max-width: 768px) {
    padding: 40px 24px;
  }
`;

const ProgramSectionAlt = styled.section`
  padding: 56px 48px;
  background: var(--public-page-kpi-bg, #ffffff);
  @media (max-width: 768px) {
    padding: 40px 24px;
  }
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: #2b6a6a;
  margin-bottom: 10px;
`;

const SectionHeading = styled.h2`
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  line-height: 1.25;
  color: #1e2d45;
  margin: 0 0 12px;
`;

const SectionBody = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: #4b5563;
  max-width: 680px;
  margin: 0;
`;

/* Pillar cards */
const PillarsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 36px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const PillarCard = styled.div<{ $accent: string }>`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-top: 3px solid ${({ $accent }) => $accent};
  border-radius: 6px;
  padding: 20px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PillarIconWrap = styled.div<{ $accent: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${({ $accent }) => $accent}18;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const PillarTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #1e2d45;
  line-height: 1.3;
`;

const PillarDesc = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: #6b7280;
`;

/* Strategic targets */
const TargetsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 36px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const TargetItem = styled.div`
  padding: 28px 24px;
  border-right: 1px solid #e5e7eb;
  text-align: center;
  background: #ffffff;
  &:last-child { border-right: none; }
  @media (max-width: 600px) {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    &:last-child { border-bottom: none; }
  }
`;

const TargetValue = styled.div`
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #2b6a6a;
  line-height: 1;
  margin-bottom: 8px;
`;

const TargetLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e2d45;
  margin-bottom: 4px;
`;

const TargetSubtext = styled.div`
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
`;

/* Partners row */
const PartnersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
`;

const PartnerChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
`;

/* ── Data sources strip ── */
const DataSourcesStrip = styled.div`
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  padding: 20px 48px;
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
  @media (max-width: 768px) {
    padding: 16px 24px;
    gap: 20px;
  }
`;

const DataSourcesLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #9ca3af;
  white-space: nowrap;
`;

const DataSourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
`;

const DataSourceDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2b6a6a;
  flex-shrink: 0;
`;

/* ── Freshness indicator ── */
const FreshnessBar = styled.div`
  background: rgba(43, 106, 106, 0.06);
  border-bottom: 1px solid rgba(43, 106, 106, 0.12);
  padding: 6px 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #2b6a6a;
  font-weight: 500;
  @media (max-width: 768px) {
    padding: 6px 24px;
  }
`;

const FreshnessDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
`;


const Footer = styled.div<{
  $height: number;
  $backgroundColor: string;
  $textColor: string;
}>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${({ $height }) => $height}px;
  background: ${({ $backgroundColor }) =>
    `var(--public-page-footer-background, ${$backgroundColor})`};
  color: ${({ $textColor }) => `var(--public-page-footer-text, ${$textColor})`};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  z-index: 100;
`;

const FooterLink = styled.a<{ $textColor: string }>`
  color: ${({ $textColor }) => `var(--public-page-footer-text, ${$textColor})`};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
`;

const ThemeToggleButton = styled(Button)`
  ${({ theme }) => `
    padding: ${theme.sizeUnit}px ${theme.sizeUnit * 2}px;
    border-radius: ${theme.borderRadius}px;
    border-color: var(--public-page-toggle-border, #d1d5db);
    background: var(--public-page-toggle-bg, #ffffff);
    color: var(--public-page-toggle-color, #374151);
    font-size: 13px;

    &:hover,
    &:focus {
      border-color: var(--public-page-primary-color, #2b6a6a) !important;
      background: var(--public-page-hover-bg, #f0f9f8) !important;
      color: var(--public-page-primary-color, #2b6a6a) !important;
    }
  `}
`;

/* ── Navigation Menu Bar ── */
const NavMenuBar = styled.div<{ $top: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: 0;
  right: 0;
  height: ${NAV_MENU_HEIGHT}px;
  background: var(--public-page-navmenu-bg, #f8fafc);
  border-bottom: 1px solid var(--public-page-welcome-border, #e5e7eb);
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 4px;
`;

const NavMenuItemBase = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: ${NAV_MENU_HEIGHT}px;
  padding: 0 14px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#2b6a6a' : 'transparent')};
  color: ${({ $active }) =>
    $active ? '#2b6a6a' : 'var(--public-page-navbar-link-color, #374151)'};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover {
    color: #2b6a6a;
    border-bottom-color: rgba(43, 106, 106, 0.4);
  }
`;

const NavMenuLink = styled.a<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: ${NAV_MENU_HEIGHT}px;
  padding: 0 14px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#2b6a6a' : 'transparent')};
  color: ${({ $active }) =>
    $active ? '#2b6a6a' : 'var(--public-page-navbar-link-color, #374151)'};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover {
    color: #2b6a6a;
    border-bottom-color: rgba(43, 106, 106, 0.4);
    text-decoration: none;
  }
`;

const NavMenuCaret = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 10px;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
  transition: transform 0.15s ease;
  opacity: 0.6;
`;

/* ── Mega Menu Dropdown ── */
const MegaMenuBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 98;
`;

const MegaMenuPanel = styled.div<{ $top: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: 0;
  right: 0;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 99;
  padding: 24px 32px 28px;
  max-height: calc(100vh - ${({ $top }) => $top}px - 48px);
  overflow-y: auto;
`;

const MegaMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const MegaMenuTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #9ca3af;
`;

const MegaMenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`;

const MegaMenuTile = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
  font-family: inherit;
  &:hover {
    border-color: #2b6a6a;
    background: #f0f9f8;
  }
`;

const MegaMenuTileIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 5px;
  background: rgba(43, 106, 106, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
`;

const MegaMenuTileLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e2d45;
  line-height: 1.3;
`;

const MegaMenuEmpty = styled.div`
  font-size: 13px;
  color: #9ca3af;
  padding: 16px 0;
`;

const MegaMenuClose = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #6b7280;
  line-height: 1;
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

interface PublicLandingPageProps {
  /** Optional override configuration */
  overrideConfig?: Partial<PublicPageLayoutConfig>;
}

export default function PublicLandingPage({
  overrideConfig,
}: PublicLandingPageProps = {}) {
  const { config: baseConfig, loading: configLoading } = usePublicPageConfig();
  const theme = useTheme();
  const [config, setConfig] = useState<PublicPageLayoutConfig>(baseConfig);
  const [selectedDashboard, setSelectedDashboard] = useState<
    Dashboard | undefined
  >(undefined);
  const [themeMode, setThemeMode] = useState<PublicPageTheme>(getStoredTheme);
  const [sidebarLayout, setSidebarLayout] = useState<PublicPageSidebarLayout>(
    getStoredSidebarLayout() || 'top',
  );
  const [navDashboards, setNavDashboards] = useState<Dashboard[]>([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  // Merge override config if provided
  useEffect(() => {
    const nextConfig = overrideConfig
      ? { ...baseConfig, ...overrideConfig }
      : baseConfig;
    setConfig(nextConfig);
  }, [baseConfig, overrideConfig]);

  // Fetch public dashboards for the mega menu
  useEffect(() => {
    SupersetClient.get({ endpoint: '/api/v1/dashboard/public/' })
      .then(({ json }) => setNavDashboards(json.result || []))
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    window.location.href = config.navbar.loginButton.url;
  };

  const handleDashboardSelect = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setMegaMenuOpen(false);
  };

  const handleWelcomeClick = () => {
    setSelectedDashboard(undefined);
    setMegaMenuOpen(false);
  };

  const { navbar, sidebar, content, footer } = config;
  const isDarkMode = themeMode === 'dark';
  const accentColor = sidebar.accentColor || theme.colorPrimary;
  const accentBg = hexToRgba(accentColor, 0.16);

  useEffect(() => {
    storeThemePreference(themeMode);
  }, [themeMode]);

  useEffect(() => {
    storeSidebarLayoutPreference(sidebarLayout);
  }, [sidebarLayout]);

  const themeVariables = useMemo<CSSProperties>(
    () =>
      ({
        '--public-page-page-background': isDarkMode ? '#0d111c' : '#ffffff',
        '--public-page-navbar-background': isDarkMode
          ? '#161b2d'
          : navbar.backgroundColor,
        '--public-page-navbar-shadow': isDarkMode
          ? '0 1px 0 rgba(255,255,255,0.06)'
          : navbar.boxShadow,
        '--public-page-navbar-link-color': isDarkMode ? '#c9d1d9' : '#374151',
        '--public-page-content-background': isDarkMode
          ? '#0b0f1a'
          : content.backgroundColor,
        '--public-page-sidebar-background': isDarkMode
          ? '#161b2d'
          : sidebar.backgroundColor,
        '--public-page-sidebar-text-color': isDarkMode
          ? '#c9d1d9'
          : sidebar.textColor || theme.colorText,
        '--public-page-sidebar-border': isDarkMode
          ? '1px solid rgba(255,255,255,0.08)'
          : sidebar.borderStyle,
        '--public-page-footer-background': isDarkMode
          ? '#0d111c'
          : footer.backgroundColor,
        '--public-page-footer-text': isDarkMode ? '#8b949e' : footer.textColor,
        '--public-page-text-color': isDarkMode ? '#e6edf3' : '#1e2d45',
        '--public-page-heading-color': isDarkMode ? '#e6edf3' : '#1e2d45',
        '--public-page-text-secondary-color': isDarkMode
          ? '#8b949e'
          : '#4b5563',
        '--public-page-primary-color': isDarkMode ? '#4db6ac' : accentColor,
        '--public-page-primary-bg': isDarkMode
          ? 'rgba(77, 182, 172, 0.15)'
          : accentBg,
        '--public-page-link-hover-color': isDarkMode ? '#4db6ac' : accentColor,
        '--public-page-hover-bg': isDarkMode
          ? 'rgba(255,255,255,0.06)'
          : '#f0f9f8',
        '--public-page-toggle-bg': isDarkMode
          ? 'rgba(255,255,255,0.08)'
          : '#ffffff',
        '--public-page-toggle-border': isDarkMode
          ? 'rgba(255,255,255,0.15)'
          : '#d1d5db',
        '--public-page-toggle-color': isDarkMode ? '#c9d1d9' : '#374151',
        '--public-page-navbar-text-color': isDarkMode ? '#e6edf3' : '#1e2d45',
        '--public-page-welcome-bg': isDarkMode
          ? 'rgba(255,255,255,0.03)'
          : '#ffffff',
        '--public-page-welcome-border': isDarkMode
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb',
        '--public-page-hero-bg': isDarkMode
          ? 'linear-gradient(160deg, #0d1f1a 0%, #0a1826 100%)'
          : 'linear-gradient(160deg, #f0f7f4 0%, #eaf4f8 100%)',
        '--public-page-kpi-bg': isDarkMode ? '#131b2e' : '#ffffff',
        '--public-page-navmenu-bg': isDarkMode ? '#131b2e' : '#f8fafc',
      }) as CSSProperties,
    [
      accentBg,
      accentColor,
      content.backgroundColor,
      footer.backgroundColor,
      footer.textColor,
      isDarkMode,
      navbar.backgroundColor,
      navbar.boxShadow,
      sidebar.backgroundColor,
      sidebar.borderStyle,
      sidebar.textColor,
      theme.colorText,
    ],
  );

  const logoSrc = isDarkMode
    ? navbar.logo.darkSrc || navbar.logo.src
    : navbar.logo.src;
  const logoTitleColor = isDarkMode
    ? navbar.title.darkColor || navbar.title.color
    : navbar.title.color;

  const handleThemeToggle = () => {
    setThemeMode(previousTheme =>
      previousTheme === 'dark' ? 'light' : 'dark',
    );
  };

  const handleSidebarLayoutToggle = () => {
    setSidebarLayout(previousLayout =>
      previousLayout === 'side' ? 'top' : 'side',
    );
  };

  if (configLoading) {
    return (
      <LoadingWrapper>
        <Loading />
      </LoadingWrapper>
    );
  }

  return (
    <PageWrapper $customCss={config.customCss} style={themeVariables}>
      {navbar.enabled && (
        <PublicNavbar
          $height={navbar.height}
          $backgroundColor={navbar.backgroundColor}
          $boxShadow={navbar.boxShadow}
        >
          <LogoSection>
            {navbar.logo.enabled && (
              <LogoImage
                src={logoSrc || logoImage}
                alt={navbar.logo.alt}
                $height={navbar.logo.height}
              />
            )}
            {navbar.title.enabled && (
              <LogoText
                $fontSize={navbar.title.fontSize}
                $fontWeight={navbar.title.fontWeight}
                $color={logoTitleColor}
              >
                {navbar.title.text}
              </LogoText>
            )}
          </LogoSection>

          <NavLinks>
            <ThemeToggleButton
              type="default"
              aria-label={
                isDarkMode
                  ? t('Switch to light mode')
                  : t('Switch to dark mode')
              }
              title={
                isDarkMode
                  ? t('Switch to light mode')
                  : t('Switch to dark mode')
              }
              icon={isDarkMode ? <Icons.SunOutlined /> : <Icons.MoonOutlined />}
              onClick={handleThemeToggle}
            />
            {navbar.loginButton.enabled && (
              <Button type={navbar.loginButton.type} onClick={handleLogin}>
                {t(navbar.loginButton.text)}
              </Button>
            )}
          </NavLinks>
        </PublicNavbar>
      )}

      {/* Navigation Menu Bar */}
      {navbar.enabled && (() => {
        const totalTop = navbar.height;
        return (
          <NavMenuBar $top={totalTop}>
            <NavMenuItemBase
              $active={!selectedDashboard && !megaMenuOpen}
              onClick={handleWelcomeClick}
            >
              Welcome
            </NavMenuItemBase>

            <NavMenuItemBase
              $active={!!selectedDashboard || megaMenuOpen}
              onClick={() => setMegaMenuOpen(prev => !prev)}
            >
              Dashboards
              <NavMenuCaret $open={megaMenuOpen}>▾</NavMenuCaret>
            </NavMenuItemBase>

            {navbar.customLinks.map((link, i) => (
              <NavMenuLink
                key={i}
                href={link.url}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
              >
                {link.text}
              </NavMenuLink>
            ))}
          </NavMenuBar>
        );
      })()}

      {/* Mega menu dropdown */}
      {megaMenuOpen && (
        <>
          <MegaMenuBackdrop onClick={() => setMegaMenuOpen(false)} />
          <MegaMenuPanel
            $top={navbar.height + NAV_MENU_HEIGHT}
            ref={megaMenuRef}
          >
            <MegaMenuHeader>
              <MegaMenuTitle>Public Dashboards</MegaMenuTitle>
              <MegaMenuClose onClick={() => setMegaMenuOpen(false)}>×</MegaMenuClose>
            </MegaMenuHeader>
            {navDashboards.length === 0 ? (
              <MegaMenuEmpty>No public dashboards available.</MegaMenuEmpty>
            ) : (
              <MegaMenuGrid>
                {navDashboards.map(db => (
                  <MegaMenuTile
                    key={db.id}
                    onClick={() => handleDashboardSelect(db)}
                  >
                    <MegaMenuTileIcon>📊</MegaMenuTileIcon>
                    <MegaMenuTileLabel>{db.dashboard_title}</MegaMenuTileLabel>
                  </MegaMenuTile>
                ))}
              </MegaMenuGrid>
            )}
          </MegaMenuPanel>
        </>
      )}

      <ContentWrapper
        $navbarHeight={navbar.enabled ? navbar.height + NAV_MENU_HEIGHT : 0}
        $sidebarWidth={sidebar.width}
        $sidebarPosition={sidebar.position}
        $sidebarEnabled={sidebar.enabled && !!selectedDashboard}
        $sidebarLayout={sidebarLayout}
        $backgroundColor={content.backgroundColor}
        $padding={content.padding}
        $mobileBreakpoint={sidebar.mobileBreakpoint}
      >
        {selectedDashboard ? (
          <>
            <ConfigurableSidebar
              config={sidebar}
              navbarHeight={navbar.enabled ? navbar.height + NAV_MENU_HEIGHT : 0}
              selectedKey={selectedDashboard.id.toString()}
              onSelect={handleDashboardSelect}
              layoutMode="top"
            />
            <DashboardContentArea
              selectedDashboard={selectedDashboard}
              isPublic
              showEmbeddingManager={false}
            />
          </>
        ) : (
          <>
            {/* Hero */}
            <HeroSection>
              <HeroContent>
                <HeroBadge>⚕ Ministry of Health · Republic of Uganda</HeroBadge>
                <HeroTitle>
                  Towards Malaria Elimination in Uganda
                </HeroTitle>
                <HeroSubtitle>
                  Real-time surveillance, intervention monitoring and transparent
                  progress reporting — transforming data into evidence-based
                  decisions for malaria elimination across all districts.
                </HeroSubtitle>
                <HeroCTARow>
                  <HeroCtaPrimary
                    as="button"
                    onClick={() => setMegaMenuOpen(true)}
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    View Dashboards →
                  </HeroCtaPrimary>
                  <HeroCtaSecondary href="/login/">
                    Sign In
                  </HeroCtaSecondary>
                </HeroCTARow>
              </HeroContent>
              <HeroVisual>
                <HeroVisualInner>
                  <HeroVisualIcon>🦟</HeroVisualIcon>
                  <HeroVisualLabel>Malaria Surveillance</HeroVisualLabel>
                </HeroVisualInner>
              </HeroVisual>
            </HeroSection>

            {/* Data freshness indicator */}
            <FreshnessBar>
              <FreshnessDot />
              Data updated from HMIS/DHIS2 · Last sync: today
            </FreshnessBar>

            {/* KPI Band */}
            <KPIBand>
              <KPICard $color="#ef4444">
                <KPICardTop>
                  <KPILabel>New Cases</KPILabel>
                  <KPIBadge $color="#ef4444">↑ Monthly</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Rolling monthly total</KPISubtext>
              </KPICard>
              <KPICard $color="#f59e0b">
                <KPICardTop>
                  <KPILabel>Malaria Deaths</KPILabel>
                  <KPIBadge $color="#f59e0b">Monthly</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Reported facility deaths</KPISubtext>
              </KPICard>
              <KPICard $color="#2b6a6a">
                <KPICardTop>
                  <KPILabel>Test Positivity</KPILabel>
                  <KPIBadge $color="#2b6a6a">SPR</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Slide positivity rate</KPISubtext>
              </KPICard>
              <KPICard $color="#22c55e">
                <KPICardTop>
                  <KPILabel>LLIN Coverage</KPILabel>
                  <KPIBadge $color="#22c55e">Coverage</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Households with nets</KPISubtext>
              </KPICard>
            </KPIBand>

            {/* Programme Mission */}
            <ProgramSection>
              <SectionLabel>About the Programme</SectionLabel>
              <SectionHeading>National Malaria Control Programme</SectionHeading>
              <SectionBody>
                The National Malaria Control Programme (NMCP) coordinates Uganda's
                comprehensive response to malaria under the Ministry of Health.
                Working towards the targets set in Uganda's National Malaria
                Strategic Plan, the programme integrates prevention, diagnosis,
                treatment and surveillance activities across all 146 districts —
                with the ultimate goal of reducing malaria morbidity and mortality
                to pre-elimination levels by 2030.
              </SectionBody>

              <PillarsGrid>
                <PillarCard $accent="#2b6a6a">
                  <PillarIconWrap $accent="#2b6a6a">🔬</PillarIconWrap>
                  <PillarTitle>Case Management</PillarTitle>
                  <PillarDesc>
                    Prompt diagnosis with RDTs and microscopy, and treatment with
                    artemisinin-based combination therapy (ACT) through health
                    facilities and community health workers.
                  </PillarDesc>
                </PillarCard>

                <PillarCard $accent="#0284c7">
                  <PillarIconWrap $accent="#0284c7">🏠</PillarIconWrap>
                  <PillarTitle>Vector Control</PillarTitle>
                  <PillarDesc>
                    Universal LLIN coverage campaigns and targeted indoor residual
                    spraying (IRS) in high-burden districts to reduce
                    human–mosquito contact.
                  </PillarDesc>
                </PillarCard>

                <PillarCard $accent="#7c3aed">
                  <PillarIconWrap $accent="#7c3aed">📡</PillarIconWrap>
                  <PillarTitle>Disease Surveillance</PillarTitle>
                  <PillarDesc>
                    HMIS-integrated case notification, epidemic detection and
                    response, malaria indicator surveys, and routine programme
                    data quality assurance.
                  </PillarDesc>
                </PillarCard>

                <PillarCard $accent="#d97706">
                  <PillarIconWrap $accent="#d97706">🌿</PillarIconWrap>
                  <PillarTitle>Preventive Chemotherapy</PillarTitle>
                  <PillarDesc>
                    Intermittent preventive treatment in pregnancy (IPTp) and
                    seasonal malaria chemoprevention (SMC) in high-transmission
                    zones to protect the most vulnerable populations.
                  </PillarDesc>
                </PillarCard>

                <PillarCard $accent="#dc2626">
                  <PillarIconWrap $accent="#dc2626">🦟</PillarIconWrap>
                  <PillarTitle>Entomology</PillarTitle>
                  <PillarDesc>
                    Continuous monitoring of vector species distribution,
                    insecticide resistance patterns and malaria transmission
                    intensity to guide intervention strategies.
                  </PillarDesc>
                </PillarCard>

                <PillarCard $accent="#059669">
                  <PillarIconWrap $accent="#059669">📢</PillarIconWrap>
                  <PillarTitle>Health Promotion</PillarTitle>
                  <PillarDesc>
                    Community mobilisation, behaviour change communication and
                    social and behaviour change (SBC) programmes to promote
                    prevention and early care-seeking.
                  </PillarDesc>
                </PillarCard>
              </PillarsGrid>
            </ProgramSection>

            {/* Strategic targets */}
            <ProgramSectionAlt>
              <SectionLabel>Strategic Targets · NMSP V</SectionLabel>
              <SectionHeading>2020–2025 National Malaria Strategic Plan</SectionHeading>
              <SectionBody>
                Uganda's fifth National Malaria Strategic Plan sets ambitious
                targets aligned with the RBM/WHO global framework for malaria
                elimination, measuring progress against baseline data from the
                2018–2019 Uganda Malaria Indicator Survey.
              </SectionBody>

              <TargetsRow>
                <TargetItem>
                  <TargetValue>≥80%</TargetValue>
                  <TargetLabel>LLIN Household Coverage</TargetLabel>
                  <TargetSubtext>
                    Proportion of households with at least one LLIN per two people
                  </TargetSubtext>
                </TargetItem>
                <TargetItem>
                  <TargetValue>≥95%</TargetValue>
                  <TargetLabel>Confirmed Case Treatment</TargetLabel>
                  <TargetSubtext>
                    Confirmed malaria cases receiving first-line artemisinin therapy
                  </TargetSubtext>
                </TargetItem>
                <TargetItem>
                  <TargetValue>≥90%</TargetValue>
                  <TargetLabel>IPTp3+ Coverage</TargetLabel>
                  <TargetSubtext>
                    Pregnant women receiving three or more doses of IPTp-SP
                  </TargetSubtext>
                </TargetItem>
              </TargetsRow>
            </ProgramSectionAlt>

            {/* Partners & data sources */}
            <ProgramSection>
              <SectionLabel>Implementing Partners &amp; Data Sources</SectionLabel>
              <SectionHeading>Programme Data Infrastructure</SectionHeading>
              <SectionBody>
                This analytics repository integrates data from Uganda's national
                health information systems and partner organisations to provide
                a unified view of malaria programme performance.
              </SectionBody>

              <PartnersRow>
                <PartnerChip>🏥 HMIS / DHIS2</PartnerChip>
                <PartnerChip>📋 NMCP Uganda</PartnerChip>
                <PartnerChip>🌐 WHO Uganda</PartnerChip>
                <PartnerChip>🤝 Global Fund</PartnerChip>
                <PartnerChip>🇺🇸 PMI / USAID</PartnerChip>
                <PartnerChip>🧬 MRC Uganda</PartnerChip>
                <PartnerChip>📊 UBOS</PartnerChip>
              </PartnersRow>

              <DataSourcesStrip style={{ marginTop: 24, padding: '16px 0', background: 'transparent', border: 'none' }}>
                <DataSourcesLabel>Integrated data feeds</DataSourcesLabel>
                <DataSourceItem><DataSourceDot />HMIS / DHIS2 — National health information system</DataSourceItem>
                <DataSourceItem><DataSourceDot />NMCP — Programme surveillance &amp; survey data</DataSourceItem>
                <DataSourceItem><DataSourceDot />iCCM — Community case management systems</DataSourceItem>
                <DataSourceItem><DataSourceDot />Entomological monitoring networks</DataSourceItem>
              </DataSourcesStrip>
            </ProgramSection>
          </>
        )}
      </ContentWrapper>

      {footer.enabled && (
        <Footer
          $height={footer.height}
          $backgroundColor={footer.backgroundColor}
          $textColor={footer.textColor}
        >
          {footer.text && <span>{footer.text}</span>}
          {footer.links.map((link, index) => (
            <FooterLink
              key={index}
              href={link.url}
              $textColor={footer.textColor}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
            >
              {link.text}
            </FooterLink>
          ))}
        </Footer>
      )}

    </PageWrapper>
  );
}

// Export config types for external use
export type { PublicPageLayoutConfig } from './config';
export { DEFAULT_PUBLIC_PAGE_CONFIG, mergeConfig } from './config';
