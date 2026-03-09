import { useState, useEffect, useMemo } from 'react';
import { styled, SupersetClient } from '@superset-ui/core';
import { Empty, Input, Button, Tag, Badge, Select } from 'antd';
import { Typography, Loading } from '@superset-ui/core/components';
import { DHIS2WizardState } from '../index';

const { Title, Paragraph, Text } = Typography;

const StepContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: start;
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const TreeContainer = styled.div`
  ${({ theme }) => `
    background: ${theme.colorBgElevated};
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    max-height: 550px;
    overflow-y: auto;
    
    .tree-item {
      padding: 8px 12px;
      margin: 4px 0;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.2s ease;
      
      &:hover {
        background: ${theme.colorBgContainer};
      }
      
      &.selected {
        background: ${theme.colorPrimaryBg};
        border-left: 3px solid ${theme.colorPrimary};
        padding-left: 9px;
      }
    }
  `}
`;

const SidePanel = styled.div`
  ${({ theme }) => `
    background: ${theme.colorBgElevated};
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    padding: 16px;
    height: fit-content;
    position: sticky;
    top: 0;
  `}
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const CategoryHeader = styled.div`
  ${({ theme }) => `
    font-weight: 600;
    padding: 12px;
    background: ${theme.colorBgContainer};
    border-radius: 4px;
    margin-top: 8px;
    font-size: 13px;
    color: ${theme.colorTextSecondary};
  `}
`;

const ErrorText = styled.div`
  color: #ff4d4f;
  font-size: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff1f0;
  border-radius: 4px;
`;

interface StepDataElementsProps {
  wizardState: DHIS2WizardState;
  updateState: (updates: Partial<DHIS2WizardState>) => void;
  errors: Record<string, string>;
  databaseId?: number;
}

const DX_TYPES = [
  { label: 'Data elements', value: 'dataElements' },
  { label: 'Indicators', value: 'indicators' },
  { label: 'Data sets', value: 'dataSets' },
  { label: 'Program indicators', value: 'programIndicators' },
  { label: 'Event data items', value: 'eventDataItems' },
];

export default function WizardStepDataElements({
  wizardState,
  updateState,
  errors,
  databaseId,
}: StepDataElementsProps) {
  const [loading, setLoading] = useState(false);
  const [dataElements, setDataElements] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [metricTypes] = useState<any[]>([
    { label: 'All metrics', value: '' },
    { label: 'Reporting rate', value: 'REPORTING_RATE' },
    { label: 'Reporting rate on time', value: 'REPORTING_RATE_ON_TIME' },
    { label: 'Actual reports', value: 'ACTUAL_REPORTS' },
    { label: 'Actual reports on time', value: 'ACTUAL_REPORTS_ON_TIME' },
    { label: 'Expected reports', value: 'EXPECTED_REPORTS' },
  ]);

  const [dxType, setDxType] = useState<string>('dataElements');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedMetricType, setSelectedMetricType] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  // DX-specific filters
  const [domainType, setDomainType] = useState<string>('');
  const [valueType, setValueType] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<string>('');
  const [disaggregation, setDisaggregation] = useState<string>('');
  const [formType, setFormType] = useState<string>('');

  useEffect(() => {
    if (databaseId) {
      fetchDataElements();
      fetchGroups();
      fetchPrograms();
      fetchDatasets();
    }
  }, [databaseId]);

  useEffect(() => {
    if (databaseId) {
      setSelectedGroup('');
      setSelectedProgram('');
      setSelectedDataset('');
      setSelectedMetricType('');
      setDomainType('');
      setValueType('');
      setAggregationType('');
      setDisaggregation('');
      setFormType('');
      fetchDataElements();
    }
  }, [dxType]);

  useEffect(() => {
    if (databaseId) {
      fetchDataElements();
    }
  }, [
    domainType,
    valueType,
    aggregationType,
    disaggregation,
    formType,
    selectedProgram,
    selectedDataset,
    selectedMetricType,
  ]);

  const buildFilterParams = (type: string): string => {
    const params = new URLSearchParams();
    params.append('type', type);

    if (type === 'dataElements') {
      if (domainType) params.append('domainType', domainType);
      if (valueType) params.append('valueType', valueType);
      if (aggregationType) params.append('aggregationType', aggregationType);
    } else if (type === 'indicators') {
      if (valueType) params.append('valueType', valueType);
    } else if (type === 'dataSets') {
      if (formType) params.append('formType', formType);
    } else if (type === 'programIndicators') {
      if (selectedProgram) params.append('programId', selectedProgram);
    } else if (type === 'eventDataItems') {
      if (selectedProgram) params.append('programId', selectedProgram);
    }

    return params.toString();
  };

  const fetchDataElements = async () => {
    setLoading(true);
    try {
      if (dxType === 'all') {
        const types = [
          'indicators',
          'dataElements',
          'dataSets',
          'eventDataItems',
          'programIndicators',
        ];
        const responses = await Promise.all(
          types.map(type =>
            SupersetClient.get({
              endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?${buildFilterParams(type)}`,
            }).catch(() => ({ json: { result: [] } })),
          ),
        );
        const allElements = responses.flatMap(
          (res: any) => res.json?.result || [],
        );
        setDataElements(allElements);
      } else {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?${buildFilterParams(dxType)}`,
        });
        setDataElements(response.json?.result || []);
      }
    } catch (error) {
      console.error('Error fetching data elements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const [deGroupsRes, indGroupsRes] = await Promise.all([
        SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?type=dataElementGroups`,
        }).catch(() => ({ json: { result: [] } })),
        SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?type=indicatorGroups`,
        }).catch(() => ({ json: { result: [] } })),
      ]);
      const allGroups = [
        ...((deGroupsRes.json as any)?.result || []).map((g: any) => ({
          ...g,
          type: 'dataElements',
        })),
        ...((indGroupsRes.json as any)?.result || []).map((g: any) => ({
          ...g,
          type: 'indicators',
        })),
      ];
      setGroups(allGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await SupersetClient.get({
        endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?type=programs`,
      });
      setPrograms(response.json?.result || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]);
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await SupersetClient.get({
        endpoint: `/api/v1/database/${databaseId}/dhis2_metadata?type=dataSets`,
      });
      setDatasets(response.json?.result || []);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setDatasets([]);
    }
  };

  const selectedGroupMemberIds = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }
    const group = groups.find((g: any) => g.id === selectedGroup);
    const members = group?.members || [];
    const ids = new Set<string>(
      members
        .map((m: any) => m?.id)
        .filter((id: string | undefined) => !!id),
    );
    return ids.size > 0 ? ids : null;
  }, [groups, selectedGroup]);

  const filteredElements = useMemo(() => {
    let filtered = dataElements;

    if (selectedGroupMemberIds) {
      filtered = filtered.filter((el: any) => selectedGroupMemberIds.has(el.id));
    }

    if (searchText.trim()) {
      const needle = searchText.toLowerCase();
      filtered = filtered.filter((el: any) =>
        (el.displayName || '').toLowerCase().includes(needle),
      );
    }

    return filtered;
  }, [dataElements, searchText, selectedGroupMemberIds]);

  const groupedElements = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};

    filteredElements.forEach((el: any) => {
      const category = el.categoryCombo || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(el);
    });

    return grouped;
  }, [filteredElements]);

  const relevantGroups = useMemo(() => {
    if (dxType === 'all') {
      return groups;
    }
    return groups.filter((g: any) => g.type === dxType);
  }, [groups, dxType]);

  const handleToggleElement = (id: string) => {
    const updated = wizardState.dataElements.includes(id)
      ? wizardState.dataElements.filter(de => de !== id)
      : [...wizardState.dataElements, id];
    updateState({ dataElements: updated });
  };

  const selectedNames = useMemo(
    () =>
      wizardState.dataElements.map(
        id => dataElements.find(el => el.id === id)?.displayName || id,
      ),
    [wizardState.dataElements, dataElements],
  );

  return (
    <StepContainer>
      <ContentSection>
        <div>
          <Title level={4}>Select Data Elements</Title>
          <Paragraph>
            Choose the data elements (indicators, measures) for your dataset.
          </Paragraph>
        </div>

        <FilterBar>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Data Type</span>
          <Select
            value={dxType}
            onChange={setDxType}
            style={{ flex: 1, minWidth: 200 }}
            options={DX_TYPES}
          />
        </FilterBar>

        {dxType === 'dataElements' && (
          <>
            <FilterBar>
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                Data element group
              </span>
              <Select
                placeholder="All groups"
                value={selectedGroup || undefined}
                onChange={setSelectedGroup}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ flex: 1, minWidth: 150 }}
                options={relevantGroups
                  .filter((g: any) => g.type === 'dataElements')
                  .map((g: any) => ({
                    label: g.displayName,
                    value: g.id,
                  }))}
              />
            </FilterBar>

            <FilterBar>
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                Disaggregation
              </span>
              <Select
                placeholder="Totals only"
                value={disaggregation || undefined}
                onChange={setDisaggregation}
                allowClear
                style={{ flex: 1, minWidth: 150 }}
                options={[
                  { label: 'Totals only', value: 'TOTALS_ONLY' },
                  { label: 'Details only', value: 'DETAILS_ONLY' },
                ]}
              />
            </FilterBar>
          </>
        )}

        {dxType === 'indicators' && (
          <FilterBar>
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              Indicator group
            </span>
            <Select
              placeholder="All groups"
              value={selectedGroup || undefined}
              onChange={setSelectedGroup}
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ flex: 1, minWidth: 150 }}
              options={relevantGroups
                .filter((g: any) => g.type === 'indicators')
                .map((g: any) => ({
                  label: g.displayName,
                  value: g.id,
                }))}
            />
          </FilterBar>
        )}

        {dxType === 'dataSets' && (
          <>
            <FilterBar>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Data set</span>
              <Select
                placeholder="All data sets"
                value={selectedDataset || undefined}
                onChange={setSelectedDataset}
                allowClear
                style={{ flex: 1, minWidth: 150 }}
                options={datasets.map((ds: any) => ({
                  label: ds.displayName,
                  value: ds.id,
                }))}
              />
            </FilterBar>

            <FilterBar>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Metric type</span>
              <Select
                placeholder="All metrics"
                value={selectedMetricType || undefined}
                onChange={setSelectedMetricType}
                allowClear
                style={{ flex: 1, minWidth: 150 }}
                options={metricTypes}
              />
            </FilterBar>
          </>
        )}

        {dxType === 'programIndicators' && (
          <FilterBar>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Program</span>
            <Select
              placeholder="All programs"
              value={selectedProgram || undefined}
              onChange={setSelectedProgram}
              allowClear
              style={{ flex: 1, minWidth: 150 }}
              options={programs.map((p: any) => ({
                label: p.displayName,
                value: p.id,
              }))}
            />
          </FilterBar>
        )}

        {dxType === 'eventDataItems' && (
          <FilterBar>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Program</span>
            <Select
              placeholder="All programs"
              value={selectedProgram || undefined}
              onChange={setSelectedProgram}
              allowClear
              style={{ flex: 1, minWidth: 150 }}
              options={programs.map((p: any) => ({
                label: p.displayName,
                value: p.id,
              }))}
            />
          </FilterBar>
        )}

        <Input.Search
          placeholder="Search..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          size="large"
        />

        {errors.dataElements && <ErrorText>{errors.dataElements}</ErrorText>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loading />
          </div>
        ) : filteredElements.length === 0 ? (
          <Empty
            description={
              searchText
                ? 'No data elements found'
                : 'No data elements available'
            }
            style={{ marginTop: 40 }}
          />
        ) : (
          <TreeContainer>
            {Object.entries(groupedElements).map(([category, elements]) => (
              <div key={category}>
                <CategoryHeader>{category}</CategoryHeader>
                {elements.map(el => (
                  <div
                    key={el.id}
                    className={`tree-item ${wizardState.dataElements.includes(el.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleElement(el.id)}
                  >
                    <span>{el.displayName}</span>
                    {wizardState.dataElements.includes(el.id) && (
                      <Badge status="success" text="Selected" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </TreeContainer>
        )}
      </ContentSection>

      <SidePanel>
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            <Badge
              count={wizardState.dataElements.length}
              style={{ backgroundColor: '#1890ff' }}
            />
            <span style={{ marginLeft: 8 }}>Selected</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {wizardState.dataElements.length === 0
              ? 'No elements selected'
              : `${wizardState.dataElements.length} element${wizardState.dataElements.length !== 1 ? 's' : ''}`}
          </Text>
        </div>

        {selectedNames.length > 0 && (
          <TagContainer>
            {selectedNames.slice(0, 4).map((name, idx) => (
              <Tag
                key={wizardState.dataElements[idx]}
                closable
                onClose={() => {
                  const updated = wizardState.dataElements.filter(
                    (_, i) => i !== idx,
                  );
                  updateState({ dataElements: updated });
                }}
                style={{ maxWidth: '100%' }}
              >
                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '80px',
                  }}
                >
                  {name}
                </span>
              </Tag>
            ))}
            {selectedNames.length > 4 && <Tag>+{selectedNames.length - 4}</Tag>}
          </TagContainer>
        )}

        <Button
          type="primary"
          danger
          block
          style={{ marginTop: 16 }}
          onClick={() => updateState({ dataElements: [] })}
          disabled={wizardState.dataElements.length === 0}
        >
          Clear All
        </Button>
      </SidePanel>
    </StepContainer>
  );
}
