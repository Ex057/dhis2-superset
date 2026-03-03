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
  ${({ theme }) => `
    color: var(--public-page-text-color, ${theme.colorText});
    text-decoration: none;
    font-size: 14px;
    &:hover {
      color: var(--public-page-link-hover-color, ${theme.colorPrimary});
    }
  `}
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

const WelcomeContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 400px;
    padding: ${theme.sizeUnit * 8}px;
    text-align: center;
  `}
`;

const WelcomeTitle = styled.h1`
  ${({ theme }) => `
    font-size: 28px;
    font-weight: 600;
    color: var(--public-page-text-color, ${theme.colorText});
    margin-bottom: ${theme.sizeUnit * 2}px;
  `}
`;

const WelcomeDescription = styled.p`
  ${({ theme }) => `
    font-size: 16px;
    color: var(--public-page-text-secondary-color, ${theme.colorTextSecondary});
    max-width: 500px;
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
    padding: ${theme.sizeUnit}px;
    border-radius: ${theme.borderRadius}px;
    border-color: var(--public-page-toggle-border, ${theme.colorBorder});
    background: var(--public-page-toggle-bg, ${theme.colorBgContainer});
    color: var(--public-page-toggle-color, ${theme.colorText});

    &:hover,
    &:focus {
      border-color: var(--public-page-toggle-border, ${theme.colorBorder});
      background: var(--public-page-hover-bg, ${theme.colorBgLayout});
      color: var(--public-page-toggle-color, ${theme.colorText});
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
  const [selectedDashboard, setSelectedDashboard] = useState<
    Dashboard | undefined
  >(undefined);
  const [themeMode, setThemeMode] = useState<PublicPageTheme>(getStoredTheme);
  const [sidebarLayout, setSidebarLayout] = useState<PublicPageSidebarLayout>(
    getStoredSidebarLayout() || 'side',
  );

  // Merge override config if provided
  const config = overrideConfig
    ? { ...baseConfig, ...overrideConfig }
    : baseConfig;

  const handleLogin = () => {
    window.location.href = config.navbar.loginButton.url;
  };

  const handleDashboardSelect = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
  };

  const { navbar, sidebar, content, footer } = config;
  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    storeThemePreference(themeMode);
  }, [themeMode]);

  useEffect(() => {
    storeSidebarLayoutPreference(sidebarLayout);
  }, [sidebarLayout]);

  const themeVariables = useMemo<CSSProperties>(
    () =>
      ({
        '--public-page-page-background': isDarkMode ? '#0f2238' : '#ffffff',
        '--public-page-navbar-background': isDarkMode
          ? '#102a43'
          : navbar.backgroundColor,
        '--public-page-navbar-shadow': isDarkMode
          ? '0 2px 10px rgba(8, 18, 32, 0.6)'
          : navbar.boxShadow,
        '--public-page-content-background': isDarkMode
          ? '#13263d'
          : content.backgroundColor,
        '--public-page-sidebar-background': isDarkMode
          ? '#0f2238'
          : sidebar.backgroundColor,
        '--public-page-sidebar-text-color': isDarkMode
          ? '#e6edf3'
          : sidebar.textColor || theme.colorText,
        '--public-page-sidebar-border': isDarkMode
          ? '1px solid #1f3a57'
          : sidebar.borderStyle,
        '--public-page-footer-background': isDarkMode
          ? '#102a43'
          : footer.backgroundColor,
        '--public-page-footer-text': isDarkMode ? '#9fb3c8' : footer.textColor,
        '--public-page-text-color': isDarkMode ? '#e6edf3' : theme.colorText,
        '--public-page-text-secondary-color': isDarkMode
          ? '#9fb3c8'
          : theme.colorTextSecondary,
        '--public-page-primary-color': isDarkMode
          ? '#74b3ff'
          : theme.colorPrimary,
        '--public-page-primary-bg': isDarkMode
          ? 'rgba(116, 179, 255, 0.2)'
          : theme.colorPrimaryBg,
        '--public-page-link-hover-color': isDarkMode
          ? '#74b3ff'
          : theme.colorPrimary,
        '--public-page-hover-bg': isDarkMode ? '#1b3553' : theme.colorBgLayout,
        '--public-page-toggle-bg': isDarkMode
          ? '#15324f'
          : theme.colorBgContainer,
        '--public-page-toggle-border': isDarkMode
          ? '#2a4b6a'
          : theme.colorBorder,
        '--public-page-toggle-color': isDarkMode ? '#e6edf3' : theme.colorText,
      }) as CSSProperties,
    [
      content.backgroundColor,
      footer.backgroundColor,
      footer.textColor,
      isDarkMode,
      navbar.backgroundColor,
      navbar.boxShadow,
      sidebar.backgroundColor,
      sidebar.borderStyle,
      theme.colorBgContainer,
      theme.colorBgLayout,
      theme.colorBorder,
      theme.colorPrimary,
      theme.colorPrimaryBg,
      theme.colorText,
      theme.colorTextSecondary,
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
        $sidebarEnabled={sidebar.enabled}
        $sidebarLayout={sidebarLayout}
        $backgroundColor={content.backgroundColor}
        $padding={content.padding}
        $mobileBreakpoint={sidebar.mobileBreakpoint}
      >
        <ConfigurableSidebar
          config={sidebar}
          navbarHeight={navbar.enabled ? navbar.height : 0}
          selectedKey={selectedDashboard?.id.toString()}
          onSelect={handleDashboardSelect}
          layoutMode={sidebarLayout}
        />
        {selectedDashboard ? (
          <DashboardContentArea
            selectedDashboard={selectedDashboard}
            isPublic
            showEmbeddingManager={false}
          />
        ) : (
          content.showWelcomeMessage && (
            <WelcomeContainer>
              <WelcomeTitle>{t(content.welcomeTitle)}</WelcomeTitle>
              <WelcomeDescription>
                {t(content.welcomeDescription)}
              </WelcomeDescription>
            </WelcomeContainer>
          )
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
