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
  background: var(--public-page-hero-bg, linear-gradient(160deg, #EFF6FC 0%, #F3F2F1 100%));
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
  background: rgba(0, 120, 212, 0.07);
  border: 1px solid rgba(0, 120, 212, 0.2);
  color: #0078D4;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 20px;
`;

const HeroTitle = styled.h1`
  font-size: 44px;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -1px;
  color: var(--public-page-heading-color, #201F1E);
  margin: 0 0 18px;
  @media (max-width: 768px) {
    font-size: 30px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 17px;
  line-height: 1.65;
  color: var(--public-page-text-secondary-color, #605E5C);
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
  background: #0078D4;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s ease;
  &:hover {
    background: #106EBE;
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
  color: #252423;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #EDEBE9;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
  &:hover {
    border-color: #A19F9D;
    background: #FAF9F8;
    color: #252423;
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
  background: rgba(0, 120, 212, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(0, 120, 212, 0.12);
  @media (max-width: 768px) {
    display: none;
  }
`;

const HeroVisualInner = styled.div`
  text-align: center;
  color: #0078D4;
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
  color: #0078D4;
  opacity: 0.8;
`;

/* ── KPI Band ── */
const KPIBand = styled.div`
  background: var(--public-page-kpi-bg, #ffffff);
  border-top: 1px solid #EDEBE9;
  border-bottom: 1px solid #EDEBE9;
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
  border-right: 1px solid #EDEBE9;
  &:last-child {
    border-right: none;
  }
  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid #EDEBE9;
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
  color: #605E5C;
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
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #201F1E;
  line-height: 1;
  margin-bottom: 6px;
`;

const KPISubtext = styled.div`
  font-size: 12px;
  color: #A19F9D;
`;

/* ── Programme pills (compact) ── */
const ProgramPillsSection = styled.section`
  padding: 32px 48px 28px;
  background: var(--public-page-kpi-bg, #ffffff);
  border-top: 1px solid #EDEBE9;
  @media (max-width: 768px) {
    padding: 24px 20px;
  }
`;

const PillsSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #A19F9D;
  margin-bottom: 16px;
`;

const PillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const ProgramPill = styled.div<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #ffffff;
  border: 1px solid #EDEBE9;
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #201F1E;
  white-space: nowrap;
`;

/* ── Live Indicator Highlights ── */
const HighlightsSection = styled.section`
  padding: 40px 48px 48px;
  @media (max-width: 768px) {
    padding: 32px 20px 40px;
  }
`;

const HighlightsSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
`;

const HighlightsSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #201F1E;
  margin: 0;
  letter-spacing: -0.3px;
`;

const HighlightsSectionSub = styled.div`
  font-size: 13px;
  color: #A19F9D;
`;

const HighlightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
`;

const HighlightCard = styled.div`
  background: #ffffff;
  border: 1px solid #EDEBE9;
  border-radius: 4px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: #0078D4;
  }
`;

const HighlightIndicatorName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #605E5C;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HighlightValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #201F1E;
  line-height: 1.1;
`;

const HighlightMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const HighlightMetaTag = styled.div`
  font-size: 11px;
  color: #A19F9D;
  background: #FAF9F8;
  border: 1px solid #EDEBE9;
  border-radius: 3px;
  padding: 1px 6px;
  font-weight: 500;
`;

const HighlightEmptyState = styled.div`
  grid-column: 1 / -1;
  padding: 48px 24px;
  text-align: center;
  color: #A19F9D;
  font-size: 15px;
  border: 1px dashed #EDEBE9;
  border-radius: 4px;
`;

const HighlightLoadingRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 10px;
  color: #A19F9D;
  font-size: 14px;
`;

/* ── Data sources strip ── */
const DataSourcesStrip = styled.div`
  background: #FAF9F8;
  border-top: 1px solid #EDEBE9;
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
  color: #A19F9D;
  white-space: nowrap;
`;

const DataSourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #605E5C;
  font-weight: 500;
`;

const DataSourceDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #0078D4;
  flex-shrink: 0;
`;

/* ── Freshness indicator ── */
const FreshnessBar = styled.div`
  background: rgba(0, 120, 212, 0.05);
  border-bottom: 1px solid rgba(0, 120, 212, 0.12);
  padding: 6px 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #0078D4;
  font-weight: 500;
  @media (max-width: 768px) {
    padding: 6px 24px;
  }
`;

const FreshnessDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #107C10;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(16, 124, 16, 0.25);
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
    border-color: var(--public-page-toggle-border, #EDEBE9);
    background: var(--public-page-toggle-bg, #ffffff);
    color: var(--public-page-toggle-color, #252423);
    font-size: 13px;

    &:hover,
    &:focus {
      border-color: var(--public-page-primary-color, #0078D4) !important;
      background: var(--public-page-hover-bg, #EFF6FC) !important;
      color: var(--public-page-primary-color, #0078D4) !important;
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
  background: var(--public-page-navmenu-bg, #FAF9F8);
  border-bottom: 1px solid var(--public-page-welcome-border, #EDEBE9);
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
  border-bottom: 2px solid ${({ $active }) => ($active ? '#0078D4' : 'transparent')};
  color: ${({ $active }) =>
    $active ? '#0078D4' : 'var(--public-page-navbar-link-color, #252423)'};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover {
    color: #0078D4;
    border-bottom-color: rgba(0, 120, 212, 0.4);
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
  border-bottom: 2px solid ${({ $active }) => ($active ? '#0078D4' : 'transparent')};
  color: ${({ $active }) =>
    $active ? '#0078D4' : 'var(--public-page-navbar-link-color, #252423)'};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover {
    color: #0078D4;
    border-bottom-color: rgba(0, 120, 212, 0.4);
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
  border-bottom: 1px solid #EDEBE9;
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
  color: #A19F9D;
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
  background: #FAF9F8;
  border: 1px solid #EDEBE9;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
  font-family: inherit;
  &:hover {
    border-color: #0078D4;
    background: #EFF6FC;
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
  color: #201F1E;
  line-height: 1.3;
`;

const MegaMenuEmpty = styled.div`
  font-size: 13px;
  color: #A19F9D;
  padding: 16px 0;
`;

const MegaMenuClose = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid #EDEBE9;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #605E5C;
  line-height: 1;
  &:hover {
    background: #f3f4f6;
    color: #252423;
  }
`;

interface IndicatorHighlight {
  indicator_name: string;
  canonical_metric_key: string | null;
  dataset_name: string;
  instance_name: string;
  period: string;
  value: string;
  value_raw: number | null;
  ingested_at: string | null;
}

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
  const sidebarLayout: PublicPageSidebarLayout = 'top';
  const [navDashboards, setNavDashboards] = useState<Dashboard[]>([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const [indicatorHighlights, setIndicatorHighlights] = useState<IndicatorHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);

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

  // Fetch live indicator highlights from staged datasets
  useEffect(() => {
    setHighlightsLoading(true);
    SupersetClient.get({
      endpoint: '/api/v1/public_page/indicator_highlights?limit=12',
    })
      .then(({ json }) => {
        setIndicatorHighlights(json.result || []);
      })
      .catch(() => {
        setIndicatorHighlights([]);
      })
      .finally(() => {
        setHighlightsLoading(false);
      });
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

  const themeVariables = useMemo<CSSProperties>(
    () =>
      ({
        '--public-page-page-background': isDarkMode ? '#1B1A19' : '#FAF9F8',
        '--public-page-navbar-background': isDarkMode ? '#252423' : '#ffffff',
        '--public-page-navbar-shadow': isDarkMode
          ? '0 1px 0 rgba(255,255,255,0.06)'
          : '0 1px 0 #EDEBE9',
        '--public-page-navbar-link-color': isDarkMode ? '#C8C6C4' : '#252423',
        '--public-page-content-background': isDarkMode ? '#1B1A19' : '#FAF9F8',
        '--public-page-sidebar-background': isDarkMode
          ? '#252423'
          : sidebar.backgroundColor,
        '--public-page-sidebar-text-color': isDarkMode
          ? '#C8C6C4'
          : sidebar.textColor || theme.colorText,
        '--public-page-sidebar-border': isDarkMode
          ? '1px solid rgba(255,255,255,0.08)'
          : sidebar.borderStyle,
        '--public-page-footer-background': isDarkMode
          ? '#1B1A19'
          : footer.backgroundColor,
        '--public-page-footer-text': isDarkMode ? '#A19F9D' : footer.textColor,
        '--public-page-text-color': isDarkMode ? '#F3F2F1' : '#201F1E',
        '--public-page-heading-color': isDarkMode ? '#F3F2F1' : '#201F1E',
        '--public-page-text-secondary-color': isDarkMode ? '#A19F9D' : '#605E5C',
        '--public-page-primary-color': isDarkMode ? '#479EF5' : accentColor,
        '--public-page-primary-bg': isDarkMode
          ? 'rgba(71, 158, 245, 0.12)'
          : accentBg,
        '--public-page-link-hover-color': isDarkMode ? '#479EF5' : accentColor,
        '--public-page-hover-bg': isDarkMode ? 'rgba(255,255,255,0.06)' : '#EFF6FC',
        '--public-page-toggle-bg': isDarkMode ? 'rgba(255,255,255,0.08)' : '#ffffff',
        '--public-page-toggle-border': isDarkMode ? 'rgba(255,255,255,0.15)' : '#EDEBE9',
        '--public-page-toggle-color': isDarkMode ? '#C8C6C4' : '#252423',
        '--public-page-navbar-text-color': isDarkMode ? '#F3F2F1' : '#201F1E',
        '--public-page-welcome-bg': isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
        '--public-page-welcome-border': isDarkMode ? 'rgba(255,255,255,0.1)' : '#EDEBE9',
        '--public-page-hero-bg': isDarkMode
          ? 'linear-gradient(160deg, #1F1E1D 0%, #252423 100%)'
          : 'linear-gradient(160deg, #EFF6FC 0%, #F3F2F1 100%)',
        '--public-page-kpi-bg': isDarkMode ? '#252423' : '#ffffff',
        '--public-page-navmenu-bg': isDarkMode ? '#252423' : '#F3F2F1',
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
              <KPICard $color="#FD625E">
                <KPICardTop>
                  <KPILabel>New Cases</KPILabel>
                  <KPIBadge $color="#FD625E">↑ Monthly</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Rolling monthly total</KPISubtext>
              </KPICard>
              <KPICard $color="#E8A114">
                <KPICardTop>
                  <KPILabel>Malaria Deaths</KPILabel>
                  <KPIBadge $color="#E8A114">Monthly</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Reported facility deaths</KPISubtext>
              </KPICard>
              <KPICard $color="#01B8AA">
                <KPICardTop>
                  <KPILabel>Test Positivity</KPILabel>
                  <KPIBadge $color="#01B8AA">SPR</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Slide positivity rate</KPISubtext>
              </KPICard>
              <KPICard $color="#107C10">
                <KPICardTop>
                  <KPILabel>LLIN Coverage</KPILabel>
                  <KPIBadge $color="#107C10">Coverage</KPIBadge>
                </KPICardTop>
                <KPIValue>—</KPIValue>
                <KPISubtext>Households with nets</KPISubtext>
              </KPICard>
            </KPIBand>

            {/* Programme pillars — compact pills */}
            <ProgramPillsSection>
              <PillsSectionLabel>NMCP Programme Pillars</PillsSectionLabel>
              <PillsRow>
                <ProgramPill $accent="#01B8AA">🔬 Case Management</ProgramPill>
                <ProgramPill $accent="#0078D4">🏠 Vector Control</ProgramPill>
                <ProgramPill $accent="#374649">📡 Disease Surveillance</ProgramPill>
                <ProgramPill $accent="#F2C80F">🌿 Preventive Chemotherapy</ProgramPill>
                <ProgramPill $accent="#FD625E">🦟 Entomology</ProgramPill>
                <ProgramPill $accent="#107C10">📢 Health Promotion</ProgramPill>
              </PillsRow>
            </ProgramPillsSection>

            {/* Live indicator highlights from staged datasets */}
            <HighlightsSection>
              <HighlightsSectionHeader>
                <div>
                  <HighlightsSectionTitle>Live Indicator Highlights</HighlightsSectionTitle>
                  <HighlightsSectionSub>
                    Latest values from HMIS/DHIS2 staged datasets · Updated automatically
                  </HighlightsSectionSub>
                </div>
              </HighlightsSectionHeader>
              <HighlightsGrid>
                {highlightsLoading ? (
                  <HighlightLoadingRow>
                    <Loading size="s" />
                    Loading indicators…
                  </HighlightLoadingRow>
                ) : indicatorHighlights.length === 0 ? (
                  <HighlightEmptyState>
                    No indicator data available yet. Connect a DHIS2 instance and sync a dataset to see live highlights here.
                  </HighlightEmptyState>
                ) : (
                  indicatorHighlights.map((h, idx) => (
                    <HighlightCard key={`${h.canonical_metric_key || h.indicator_name}-${idx}`}>
                      <HighlightIndicatorName title={h.indicator_name}>
                        {h.indicator_name}
                      </HighlightIndicatorName>
                      <HighlightValue>{h.value}</HighlightValue>
                      <HighlightMeta>
                        <HighlightMetaTag>{h.period}</HighlightMetaTag>
                        <HighlightMetaTag>{h.instance_name}</HighlightMetaTag>
                      </HighlightMeta>
                    </HighlightCard>
                  ))
                )}
              </HighlightsGrid>
            </HighlightsSection>

            {/* Data sources strip */}
            <DataSourcesStrip>
              <DataSourcesLabel>Data feeds</DataSourcesLabel>
              <DataSourceItem><DataSourceDot />HMIS / DHIS2 — National health information system</DataSourceItem>
              <DataSourceItem><DataSourceDot />NMCP — Programme surveillance &amp; survey data</DataSourceItem>
              <DataSourceItem><DataSourceDot />iCCM — Community case management systems</DataSourceItem>
              <DataSourceItem><DataSourceDot />Entomological monitoring networks</DataSourceItem>
            </DataSourcesStrip>
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
