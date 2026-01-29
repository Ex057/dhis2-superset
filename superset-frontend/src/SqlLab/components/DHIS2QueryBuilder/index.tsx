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

import { useMemo, useState, useCallback, useEffect } from 'react';
import { styled, t } from '@superset-ui/core';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Input,
  Select,
  Space,
  Typography,
  type SelectValue,
} from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';

const { Panel } = Collapse;

interface DHIS2QueryBuilderProps {
  onInsertSQL: (sql: string) => void;
  databaseId?: number;
  endpoint?: string;
}

interface SelectedItemListProps {
  items: string[];
  onRemove: (value: string) => void;
}

const StyledContainer = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 4}px;
    background: ${theme.colorBgContainer};
    border-radius: ${theme.borderRadius}px;
    margin: ${theme.sizeUnit * 2}px 0;
    border: 1px solid ${theme.colorBorder};
    max-height: 100vh;
    overflow-y: auto;
    
    .section-title {
      font-weight: 600;
      margin-bottom: ${theme.sizeUnit * 2}px;
      color: ${theme.colorText};
      display: flex;
      align-items: center;
      gap: ${theme.sizeUnit}px;
    }

    .ant-collapse {
      border: none !important;
      background: transparent !important;
      margin-bottom: ${theme.sizeUnit * 2}px;
      
      .ant-collapse-item {
        margin-bottom: ${theme.sizeUnit * 2}px;
        border: 1px solid ${theme.colorBorder} !important;
        border-radius: ${theme.borderRadius}px !important;
      }
      
      .ant-collapse-header {
        padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 2.5}px !important;
        background: ${theme.colorBgElevated} !important;
        font-weight: 500 !important;
      }
      
      .ant-collapse-content-box {
        padding: ${theme.sizeUnit * 2.5}px !important;
        min-height: 400px;
        overflow-y: auto;
        max-height: 500px;
      }
    }

    .preview-container {
      background: ${theme.colorBgLayout};
      color: ${theme.colorText};
      padding: ${theme.sizeUnit * 3}px;
      border-radius: ${theme.borderRadius}px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid ${theme.colorBorder};
      margin: ${theme.sizeUnit * 2}px 0;
      min-height: 100px;
      max-height: 200px;
      overflow-y: auto;
    }

    .help-text {
      color: ${theme.colorTextSecondary};
      font-size: 12px;
      margin-top: ${theme.sizeUnit}px;
    }

    .button-group {
      display: flex;
      gap: ${theme.sizeUnit * 2}px;
      margin-top: ${theme.sizeUnit * 3}px;
      flex-wrap: wrap;
    }

    .input-row {
      display: flex;
      gap: ${theme.sizeUnit * 2}px;
      align-items: center;
    }

    .selected-list {
      display: flex;
      flex-wrap: wrap;
      gap: ${theme.sizeUnit}px;
      margin-top: ${theme.sizeUnit * 2}px;
    }

    .selected-pill {
      display: inline-flex;
      align-items: center;
      gap: ${theme.sizeUnit}px;
      padding: ${theme.sizeUnit}px ${theme.sizeUnit * 1.5}px;
      border-radius: ${theme.borderRadius}px;
      background: ${theme.colorBgElevated};
      border: 1px solid ${theme.colorBorder};
      font-size: 12px;
    }
  `}
`;

const RELATIVE_PERIOD_OPTIONS: Array<{ label: string; value: string }> = [
  { label: t('Today'), value: 'TODAY' },
  { label: t('Yesterday'), value: 'YESTERDAY' },
  { label: t('Last 7 days'), value: 'LAST_7_DAYS' },
  { label: t('Last 30 days'), value: 'LAST_30_DAYS' },
  { label: t('This month'), value: 'THIS_MONTH' },
  { label: t('Last month'), value: 'LAST_MONTH' },
  { label: t('This quarter'), value: 'THIS_QUARTER' },
  { label: t('Last quarter'), value: 'LAST_QUARTER' },
  { label: t('This year'), value: 'THIS_YEAR' },
  { label: t('Last year'), value: 'LAST_YEAR' },
  { label: t('Last 3 months'), value: 'LAST_3_MONTHS' },
  { label: t('Last 6 months'), value: 'LAST_6_MONTHS' },
  { label: t('Last 12 months'), value: 'LAST_12_MONTHS' },
];

const ORG_UNIT_QUICK_OPTIONS = [
  { label: t('User org unit'), value: 'USER_ORGUNIT' },
  { label: t('Children'), value: 'USER_ORGUNIT_CHILDREN' },
  { label: t('Grandchildren'), value: 'USER_ORGUNIT_GRANDCHILDREN' },
];

const DISPLAY_PROPERTY_OPTIONS = [
  { label: t('Name'), value: 'NAME' },
  { label: t('Short name'), value: 'SHORTNAME' },
  { label: t('Code'), value: 'CODE' },
];

function SelectedItemList({ items, onRemove }: SelectedItemListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="selected-list">
      {items.map(item => (
        <span className="selected-pill" key={item}>
          {item}
          <Button
            buttonStyle="link"
            buttonSize="small"
            icon={<Icons.CloseOutlined />}
            onClick={() => onRemove(item)}
          />
        </span>
      ))}
    </div>
  );
}

export default function DHIS2QueryBuilder({
  onInsertSQL,
  databaseId = 0,
  endpoint = 'analytics',
}: DHIS2QueryBuilderProps) {
  const [dataElements, setDataElements] = useState<string[]>([]);
  const [dataElementInput, setDataElementInput] = useState('');
  const [relativePeriods, setRelativePeriods] = useState<string[]>([]);
  const [customPeriods, setCustomPeriods] = useState<string[]>([]);
  const [customPeriodInput, setCustomPeriodInput] = useState('');
  const [quickOrgUnits, setQuickOrgUnits] = useState<string[]>([
    'USER_ORGUNIT',
  ]);
  const [customOrgUnits, setCustomOrgUnits] = useState<string[]>([]);
  const [customOrgUnitInput, setCustomOrgUnitInput] = useState('');
  const [displayProperty, setDisplayProperty] = useState('NAME');
  const [skipMeta, setSkipMeta] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const orgUnits = useMemo(
    () => [...new Set([...quickOrgUnits, ...customOrgUnits])],
    [quickOrgUnits, customOrgUnits],
  );

  const periods = useMemo(
    () => [...new Set([...relativePeriods, ...customPeriods])],
    [relativePeriods, customPeriods],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (dataElements.length === 0) {
      errors.push(t('Add at least one data element (dx).'));
    }
    if (periods.length === 0) {
      errors.push(t('Select at least one period (pe).'));
    }
    return errors;
  }, [dataElements.length, periods.length]);

  const generatedSQL = useMemo(
    () =>
      generateAnalyticsSQL({
        dataElements,
        periods,
        orgUnits,
        displayProperty,
        skipMeta,
        endpoint,
      }),
    [dataElements, periods, orgUnits, displayProperty, skipMeta, endpoint],
  );

  useEffect(() => {
    if (!copyStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setCopyStatus(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const handleRelativePeriodsChange = useCallback((value: SelectValue) => {
    if (Array.isArray(value)) {
      setRelativePeriods(value.filter(Boolean).map(String));
      return;
    }
    setRelativePeriods(value ? [String(value)] : []);
  }, []);

  const handleDisplayPropertyChange = useCallback((value: SelectValue) => {
    if (typeof value === 'string') {
      setDisplayProperty(value);
    }
  }, []);

  const addItem = useCallback(
    (
      value: string,
      setValue: (next: string[]) => void,
      list: string[],
      resetInput: () => void,
    ) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      if (!list.includes(trimmed)) {
        setValue([...list, trimmed]);
      }
      resetInput();
    },
    [],
  );

  const removeItem = useCallback(
    (value: string, list: string[], setList: (next: string[]) => void) => {
      setList(list.filter(item => item !== value));
    },
    [],
  );

  const handleInsertSQL = useCallback(() => {
    if (validationErrors.length === 0) {
      onInsertSQL(generatedSQL);
      setShowValidation(false);
    } else {
      setShowValidation(true);
    }
  }, [validationErrors.length, generatedSQL, onInsertSQL]);

  const handleCopySQL = useCallback(() => {
    navigator.clipboard.writeText(generatedSQL);
    setCopyStatus(t('SQL copied to clipboard'));
  }, [generatedSQL]);

  const handleClear = useCallback(() => {
    setDataElements([]);
    setRelativePeriods([]);
    setCustomPeriods([]);
    setQuickOrgUnits(['USER_ORGUNIT']);
    setCustomOrgUnits([]);
    setDisplayProperty('NAME');
    setSkipMeta(false);
    setShowValidation(false);
    setCopyStatus(null);
  }, []);

  return (
    <StyledContainer>
      <div className="section-title">
        <Icons.AppstoreOutlined /> {t('DHIS2 Query Builder')}
      </div>

      <Collapse defaultActiveKey={['1', '2', '3', '4']}>
        {/* Data Elements */}
        <Panel header={`${t('Data Elements')} (${dataElements.length})`} key="1">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className="input-row">
              <Input
                value={dataElementInput}
                onChange={event => setDataElementInput(event.target.value)}
                onPressEnter={() =>
                  addItem(
                    dataElementInput,
                    setDataElements,
                    dataElements,
                    () => setDataElementInput(''),
                  )
                }
                placeholder={t('Enter data element UID')}
                aria-label={t('Data element UID')}
              />
              <Button
                buttonStyle="secondary"
                onClick={() =>
                  addItem(
                    dataElementInput,
                    setDataElements,
                    dataElements,
                    () => setDataElementInput(''),
                  )
                }
              >
                {t('Add')}
              </Button>
            </div>
            <SelectedItemList
              items={dataElements}
              onRemove={value =>
                removeItem(value, dataElements, setDataElements)
              }
            />
            <div className="help-text">
              {t('Add one or more DHIS2 data element UIDs (dx).')}
            </div>
          </Space>
        </Panel>

        {/* Periods */}
        <Panel header={`${t('Periods')} (${periods.length})`} key="2">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>{t('Relative periods')}</Typography.Text>
              <Select
                ariaLabel={t('Select relative periods')}
                mode="multiple"
                value={relativePeriods}
                options={RELATIVE_PERIOD_OPTIONS}
                onChange={handleRelativePeriodsChange}
                allowClear
                css={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div>
              <Typography.Text strong>{t('Custom periods')}</Typography.Text>
              <div className="input-row" style={{ marginTop: 8 }}>
                <Input
                  value={customPeriodInput}
                  onChange={event => setCustomPeriodInput(event.target.value)}
                  onPressEnter={() =>
                    addItem(
                      customPeriodInput,
                      setCustomPeriods,
                      customPeriods,
                      () => setCustomPeriodInput(''),
                    )
                  }
                  placeholder={t('Enter custom period (e.g. 202401)')}
                  aria-label={t('Custom period')}
                />
                <Button
                  buttonStyle="secondary"
                  onClick={() =>
                    addItem(
                      customPeriodInput,
                      setCustomPeriods,
                      customPeriods,
                      () => setCustomPeriodInput(''),
                    )
                  }
                >
                  {t('Add')}
                </Button>
              </div>
              <SelectedItemList
                items={customPeriods}
                onRemove={value =>
                  removeItem(value, customPeriods, setCustomPeriods)
                }
              />
            </div>
            <div className="help-text">
              {t('Select relative periods and/or add custom period IDs.')}
            </div>
          </Space>
        </Panel>

        {/* Organization Units */}
        <Panel header={`${t('Organisation Units')} (${orgUnits.length})`} key="3">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>{t('Quick select')}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Checkbox.Group
                  options={ORG_UNIT_QUICK_OPTIONS}
                  value={quickOrgUnits}
                  onChange={values =>
                    setQuickOrgUnits(values as string[])
                  }
                />
              </div>
            </div>
            <div>
              <Typography.Text strong>{t('Custom org units')}</Typography.Text>
              <div className="input-row" style={{ marginTop: 8 }}>
                <Input
                  value={customOrgUnitInput}
                  onChange={event => setCustomOrgUnitInput(event.target.value)}
                  onPressEnter={() =>
                    addItem(
                      customOrgUnitInput,
                      setCustomOrgUnits,
                      customOrgUnits,
                      () => setCustomOrgUnitInput(''),
                    )
                  }
                  placeholder={t('Enter org unit UID')}
                  aria-label={t('Org unit UID')}
                />
                <Button
                  buttonStyle="secondary"
                  onClick={() =>
                    addItem(
                      customOrgUnitInput,
                      setCustomOrgUnits,
                      customOrgUnits,
                      () => setCustomOrgUnitInput(''),
                    )
                  }
                >
                  {t('Add')}
                </Button>
              </div>
              <SelectedItemList
                items={customOrgUnits}
                onRemove={value =>
                  removeItem(value, customOrgUnits, setCustomOrgUnits)
                }
              />
            </div>
            <div className="help-text">
              {t('Use quick org unit keywords or add specific UIDs.')}
            </div>
          </Space>
        </Panel>

        {/* Options */}
        <Panel header={t('Options')} key="4">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>{t('Display property')}</Typography.Text>
              <Select
                ariaLabel={t('Select display property')}
                value={displayProperty}
                options={DISPLAY_PROPERTY_OPTIONS}
                onChange={handleDisplayPropertyChange}
                css={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <Checkbox
              checked={skipMeta}
              onChange={event => setSkipMeta(event.target.checked)}
            >
              {t('Skip metadata (faster responses)')}
            </Checkbox>
          </Space>
        </Panel>
      </Collapse>

      {/* Preview */}
      <div style={{ marginTop: 16 }}>
        <div className="section-title">{t('Generated SQL')}</div>
        <div className="preview-container">{generatedSQL}</div>
        {copyStatus && (
          <div className="help-text" role="status">
            {copyStatus}
          </div>
        )}
        {showValidation && validationErrors.length > 0 && (
          <Alert
            type="error"
            message={t('Fix the following before inserting SQL:')}
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {validationErrors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            }
          />
        )}
      </div>

      {/* Actions */}
      <div className="button-group">
        <Button
          buttonStyle="primary"
          icon={<Icons.AppstoreOutlined />}
          onClick={handleInsertSQL}
          disabled={validationErrors.length > 0}
        >
          {t('Insert at Cursor')}
        </Button>
        <Button icon={<Icons.CopyOutlined />} onClick={handleCopySQL}>
          {t('Copy SQL')}
        </Button>
        <Button
          icon={<Icons.DeleteOutlined />}
          onClick={handleClear}
          buttonStyle="danger"
        >
          {t('Clear All')}
        </Button>
      </div>
      <div className="help-text">
        {t('Database')} {databaseId} · {t('Endpoint')}: {endpoint}
      </div>
    </StyledContainer>
  );
}

function generateAnalyticsSQL({
  dataElements,
  periods,
  orgUnits,
  displayProperty,
  skipMeta,
  endpoint,
}: {
  dataElements: string[];
  periods: string[];
  orgUnits: string[];
  displayProperty: string;
  skipMeta: boolean;
  endpoint: string;
}): string {
  if (dataElements.length === 0 || periods.length === 0) {
    return '-- Select data elements and periods to generate SQL';
  }

  const params = [
    `dimension=dx:${dataElements.join(';')}`,
    `dimension=pe:${periods.join(';')}`,
  ];

  if (orgUnits.length > 0) {
    params.push(`dimension=ou:${orgUnits.join(';')}`);
  }

  if (displayProperty) {
    params.push(`displayProperty=${displayProperty}`);
  }

  if (skipMeta) {
    params.push('skipMeta=true');
  }

  const queryString = params.join('&');

  return `-- DHIS2: ${queryString}
SELECT * FROM ${endpoint}
`;
}
