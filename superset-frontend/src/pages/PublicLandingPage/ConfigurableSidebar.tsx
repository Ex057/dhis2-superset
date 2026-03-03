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

import { useState, useEffect } from 'react';
import { styled, SupersetClient, t } from '@superset-ui/core';
import { Loading, Menu } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import { PublicPageSidebarConfig } from './config';

interface Dashboard {
  id: number;
  dashboard_title: string;
  slug: string;
  url: string;
  uuid?: string;
  display_order?: number;
}

interface ConfigurableSidebarProps {
  config: PublicPageSidebarConfig;
  navbarHeight: number;
  selectedKey?: string;
  onSelect?: (dashboard: Dashboard) => void;
  layoutMode?: 'side' | 'top';
}

const StyledSidebar = styled.div<{
  $width: number;
  $position: string;
  $backgroundColor: string;
  $borderStyle: string;
  $navbarHeight: number;
  $mobileBreakpoint: number;
  $layoutMode: 'side' | 'top';
}>`
  ${({
    $layoutMode,
    $width,
    $navbarHeight,
    $backgroundColor,
    $position,
    $borderStyle,
  }) =>
    $layoutMode === 'top'
      ? `
        width: 100%;
        min-height: auto;
        background: var(--public-page-sidebar-background, ${$backgroundColor});
        border-bottom: var(--public-page-sidebar-border, ${$borderStyle});
        position: sticky;
        top: ${$navbarHeight}px;
        left: 0;
        right: 0;
        z-index: 4;
        overflow-x: auto;
        overflow-y: hidden;
      `
      : `
        width: ${$width}px;
        min-height: calc(100vh - ${$navbarHeight}px);
        background: var(--public-page-sidebar-background, ${$backgroundColor});
        ${
          $position === 'left'
            ? `border-right: var(--public-page-sidebar-border, ${$borderStyle});`
            : `border-left: var(--public-page-sidebar-border, ${$borderStyle});`
        }
        position: fixed;
        ${$position === 'left' ? 'left: 0;' : 'right: 0;'}
        top: ${$navbarHeight}px;
        z-index: 5;
        overflow-y: auto;
      `}
  transition: all 0.3s ease;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    ${({ $layoutMode }) =>
      $layoutMode === 'top'
        ? `
          position: static;
          top: auto;
        `
        : `
    width: 0;
    overflow: hidden;
        `}
  }
`;

const StyledMenu = styled(Menu)<{ $layoutMode: 'side' | 'top' }>`
  ${({ theme, $layoutMode }) => `
    background: transparent;
    border-right: none;
    padding: ${$layoutMode === 'top' ? `${theme.sizeUnit * 2}px` : `${theme.sizeUnit * 2}px 0`};

    .ant-menu-item {
      height: auto;
      line-height: 1.4;
      padding: ${theme.sizeUnit * 3}px ${theme.sizeUnit * 4}px !important;
      margin: 0 ${$layoutMode === 'top' ? `${theme.sizeUnit}px` : '0'};
      display: flex;
      align-items: center;
      color: var(--public-page-sidebar-text-color, ${theme.colorText});
      font-size: 14px;
      border-radius: ${$layoutMode === 'top' ? `${theme.borderRadius}px` : '0'};
      white-space: nowrap;

      &:hover {
        background: var(--public-page-hover-bg, ${theme.colorBgLayout});
        color: var(--public-page-primary-color, ${theme.colorPrimary});
      }

      &.ant-menu-item-selected {
        background: var(--public-page-primary-bg, ${theme.colorPrimaryBg});
        color: var(--public-page-primary-color, ${theme.colorPrimary});
        font-weight: 600;
      }

      .ant-menu-item-icon {
        font-size: 18px;
        min-width: 24px;
        margin-right: ${theme.sizeUnit * 2}px;
      }
    }

    &.ant-menu-horizontal {
      border-bottom: none;
      line-height: normal;
      white-space: nowrap;
    }

    &.ant-menu-horizontal::after {
      display: none;
    }

    .ant-menu-item-divider {
      margin: ${theme.sizeUnit}px 0;
      background: var(--public-page-border-color, ${theme.colorBorderSecondary});
    }
  `}
`;

const SidebarTitle = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 4}px ${theme.sizeUnit * 4}px ${theme.sizeUnit * 2}px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--public-page-sidebar-text-color, ${theme.colorTextSecondary});
  `}
`;

const TopBarInner = styled.div`
  min-width: max-content;
`;

const LoadingContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    justify-content: center;
    align-items: center;
    padding: ${theme.sizeUnit * 8}px;
  `}
`;

const EmptyMessage = styled.span`
  ${({ theme }) => `
    color: var(--public-page-sidebar-text-color, ${theme.colorTextSecondary});
  `}
`;

export default function ConfigurableSidebar({
  config,
  navbarHeight,
  selectedKey,
  onSelect,
  layoutMode = 'side',
}: ConfigurableSidebarProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboards = async () => {
      setLoading(true);
      try {
        const response = await SupersetClient.get({
          endpoint: '/api/v1/dashboard/public/',
        });
        const fetchedDashboards = response.json.result || [];
        setDashboards(fetchedDashboards);

        // Auto-select first dashboard if none selected
        if (fetchedDashboards.length > 0 && !selectedKey && onSelect) {
          onSelect(fetchedDashboards[0]);
        }
      } catch (error) {
        console.error('Error fetching dashboards:', error);
        setDashboards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    const dashboard = dashboards.find(d => d.id.toString() === key);
    if (dashboard && onSelect) {
      onSelect(dashboard);
    }
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <StyledSidebar
      $width={config.width}
      $position={config.position}
      $backgroundColor={config.backgroundColor}
      $borderStyle={config.borderStyle}
      $navbarHeight={navbarHeight}
      $mobileBreakpoint={config.mobileBreakpoint}
      $layoutMode={layoutMode}
    >
      {layoutMode === 'top' ? (
        <TopBarInner>
          <SidebarTitle>{t(config.title)}</SidebarTitle>
          {loading ? (
            <LoadingContainer>
              <Loading />
            </LoadingContainer>
          ) : dashboards.length === 0 ? (
            <LoadingContainer>
              <EmptyMessage>{t('No dashboards available')}</EmptyMessage>
            </LoadingContainer>
          ) : (
            <StyledMenu
              $layoutMode={layoutMode}
              mode="horizontal"
              selectedKeys={selectedKey ? [selectedKey] : []}
              onClick={handleMenuClick}
              items={dashboards.map(dashboard => ({
                key: dashboard.id.toString(),
                icon: <Icons.DashboardOutlined />,
                label: dashboard.dashboard_title,
              }))}
            />
          )}
        </TopBarInner>
      ) : (
        <>
          <SidebarTitle>{t(config.title)}</SidebarTitle>
          {loading ? (
            <LoadingContainer>
              <Loading />
            </LoadingContainer>
          ) : dashboards.length === 0 ? (
            <LoadingContainer>
              <EmptyMessage>{t('No dashboards available')}</EmptyMessage>
            </LoadingContainer>
          ) : (
            <StyledMenu
              $layoutMode={layoutMode}
              mode="inline"
              selectedKeys={selectedKey ? [selectedKey] : []}
              onClick={handleMenuClick}
              items={dashboards.map(dashboard => ({
                key: dashboard.id.toString(),
                icon: <Icons.DashboardOutlined />,
                label: dashboard.dashboard_title,
              }))}
            />
          )}
        </>
      )}
    </StyledSidebar>
  );
}

export type { Dashboard };
