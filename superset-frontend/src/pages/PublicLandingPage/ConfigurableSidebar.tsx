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
import { Menu, Spin } from 'antd';
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
}

const StyledSidebar = styled.div<{
  $width: number;
  $position: string;
  $backgroundColor: string;
  $borderStyle: string;
  $navbarHeight: number;
  $mobileBreakpoint: number;
}>`
  width: ${({ $width }) => $width}px;
  min-height: calc(100vh - ${({ $navbarHeight }) => $navbarHeight}px);
  background: ${({ $backgroundColor }) =>
    `var(--public-page-sidebar-background, ${$backgroundColor})`};
  ${({ $position, $borderStyle }) =>
    $position === 'left'
      ? `border-right: var(--public-page-sidebar-border, ${$borderStyle});`
      : `border-left: var(--public-page-sidebar-border, ${$borderStyle});`}
  position: fixed;
  ${({ $position }) => ($position === 'left' ? 'left: 0;' : 'right: 0;')}
  top: ${({ $navbarHeight }) => $navbarHeight}px;
  z-index: 5;
  overflow-y: auto;
  transition: all 0.3s ease;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    width: 0;
    overflow: hidden;
  }
`;

const StyledMenu = styled(Menu)`
  ${({ theme }) => `
    background: transparent;
    border-right: none;
    padding: ${theme.sizeUnit * 2}px 0;

    .ant-menu-item {
      height: auto;
      line-height: 1.4;
      padding: ${theme.sizeUnit * 3}px ${theme.sizeUnit * 4}px !important;
      margin: 0;
      display: flex;
      align-items: center;
      color: var(--public-page-sidebar-text-color, ${theme.colorText});
      font-size: 14px;
      border-radius: 0;

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
    >
      <SidebarTitle>{t(config.title)}</SidebarTitle>
      {loading ? (
        <LoadingContainer>
          <Spin />
        </LoadingContainer>
      ) : dashboards.length === 0 ? (
        <LoadingContainer>
          <EmptyMessage>{t('No dashboards available')}</EmptyMessage>
        </LoadingContainer>
      ) : (
        <StyledMenu
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
    </StyledSidebar>
  );
}

export type { Dashboard };
