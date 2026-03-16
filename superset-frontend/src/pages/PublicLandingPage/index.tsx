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

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { styled, t, useTheme } from '@superset-ui/core';
import { Button, Loading } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import logoImage from 'src/assets/images/loog.jpg';
import DashboardContentArea from 'src/features/home/DashboardContentArea';
import ConfigurableSidebar, { type Dashboard } from './ConfigurableSidebar';
import { usePublicPageConfig } from './usePublicPageConfig';
import { PublicPageLayoutConfig } from './config';

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

const NavLink = styled.a`
  color: var(--public-page-navbar-link-color, #374151);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s ease;
  &:hover {
    color: var(--public-page-primary-color, #2b6a6a);
  }
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

/* ── Section header ── */
const SectionContainer = styled.div`
  padding: 40px 48px 24px;
  @media (max-width: 768px) {
    padding: 32px 24px 16px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #1e2d45;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 0;
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

/* ── Dashboard browse section ── */
const DashboardBrowseSection = styled.div`
  padding: 0 48px 40px;
  @media (max-width: 768px) {
    padding: 0 24px 32px;
  }
`;

/* Keep backward compat for dashboard view */
const WelcomeContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 240px;
    padding: ${theme.sizeUnit * 8}px ${theme.sizeUnit * 6}px;
    text-align: center;
    background: var(--public-page-welcome-bg, ${theme.colorBgContainer});
    border-radius: ${theme.borderRadius}px;
  `}
`;

const WelcomeTitle = styled.h1`
  ${({ theme }) => `
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    line-height: 1.2;
    color: var(--public-page-heading-color, ${theme.colorTextHeading});
    margin-bottom: ${theme.sizeUnit * 2}px;
  `}
`;

const WelcomeDescription = styled.p`
  ${({ theme }) => `
    font-size: 14px;
    line-height: 1.6;
    margin-top: 0;
    color: var(--public-page-text-secondary-color, ${theme.colorTextSecondary});
    max-width: 480px;
  `}
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

  // Merge override config if provided
  useEffect(() => {
    const nextConfig = overrideConfig
      ? { ...baseConfig, ...overrideConfig }
      : baseConfig;
    setConfig(nextConfig);
  }, [baseConfig, overrideConfig]);


  const handleLogin = () => {
    window.location.href = config.navbar.loginButton.url;
  };

  const handleDashboardSelect = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
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
            {navbar.customLinks.map((link, index) => (
              <NavLink
                key={index}
                href={link.url}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
              >
                {link.text}
              </NavLink>
            ))}
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
            {sidebar.enabled && (
              <ThemeToggleButton
                type="default"
                aria-label={
                  sidebarLayout === 'side'
                    ? t('Move dashboard list to top')
                    : t('Move dashboard list to side')
                }
                title={
                  sidebarLayout === 'side'
                    ? t('Move dashboard list to top')
                    : t('Move dashboard list to side')
                }
                icon={
                  sidebarLayout === 'side' ? (
                    <Icons.VerticalAlignTopOutlined />
                  ) : (
                    <Icons.VerticalLeftOutlined />
                  )
                }
                onClick={handleSidebarLayoutToggle}
              />
            )}
            {navbar.loginButton.enabled && (
              <Button type={navbar.loginButton.type} onClick={handleLogin}>
                {t(navbar.loginButton.text)}
              </Button>
            )}
          </NavLinks>
        </PublicNavbar>
      )}

      <ContentWrapper
        $navbarHeight={navbar.enabled ? navbar.height : 0}
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
              navbarHeight={navbar.enabled ? navbar.height : 0}
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
                  <HeroCtaPrimary href="#dashboards">
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

            {/* Dashboard browse section */}
            <DashboardBrowseSection id="dashboards">
              <SectionContainer style={{ padding: '40px 0 16px' }}>
                <SectionHeader>
                  <div>
                    <SectionTitle>Public Dashboards</SectionTitle>
                    <SectionSubtitle style={{ marginTop: 4 }}>
                      {t(content.welcomeDescription)}
                    </SectionSubtitle>
                  </div>
                </SectionHeader>
              </SectionContainer>
              <ConfigurableSidebar
                config={sidebar}
                navbarHeight={0}
                selectedKey={undefined}
                onSelect={handleDashboardSelect}
                layoutMode="top"
              />
              {content.showWelcomeMessage && (
                <WelcomeContainer>
                  <WelcomeTitle>{t(content.welcomeTitle)}</WelcomeTitle>
                  <WelcomeDescription>
                    {t(content.welcomeDescription)}
                  </WelcomeDescription>
                </WelcomeContainer>
              )}
            </DashboardBrowseSection>

            {/* Data sources strip */}
            <DataSourcesStrip>
              <DataSourcesLabel>Data sources</DataSourcesLabel>
              <DataSourceItem><DataSourceDot />HMIS / DHIS2 — National health information</DataSourceItem>
              <DataSourceItem><DataSourceDot />NMCP — Programme surveillance data</DataSourceItem>
              <DataSourceItem><DataSourceDot />Community case management systems</DataSourceItem>
              <DataSourceItem><DataSourceDot />Entomology &amp; vector surveillance</DataSourceItem>
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
