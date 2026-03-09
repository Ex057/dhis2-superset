import { useState, useEffect, useMemo, useCallback } from 'react';
import { styled, SupersetClient, useTheme } from '@superset-ui/core';
import Tree from '@superset-ui/core/components/Tree';
import {
  Input,
  Empty,
  Tag,
  Button,
  Badge,
  Row,
  Col,
  Select,
  Radio,
  Checkbox,
  Typography,
  Loading,
} from '@superset-ui/core/components';
import { DHIS2WizardState } from '../index';

const { Title, Paragraph, Text } = Typography;

const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const OptionsContainer = styled.div`
  ${({ theme }) => `
    background: ${theme.colorBgElevated};
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    padding: 16px;
  `}
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TreeContainer = styled.div`
  ${({ theme }) => `
    background: ${theme.colorBgElevated};
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    max-height: 500px;
    overflow-y: auto;
    padding: 8px;
  `}
`;

const FiltersRow = styled(Row)`
  margin-bottom: 16px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colorTextBase};
`;

const SelectedSummary = styled.div`
  ${({ theme }) => `
    background: ${theme.colorBgElevated};
    border: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    padding: 16px;
    margin-top: 24px;
  `}
`;

const ErrorText = styled.div`
  ${({ theme }) => `
    color: ${theme.colorErrorText};
    font-size: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: ${theme.colorErrorBg};
    border-radius: 4px;
  `}
`;

interface StepOrgUnitsProps {
  wizardState: DHIS2WizardState;
  updateState: (updates: Partial<DHIS2WizardState>) => void;
  errors: Record<string, string>;
  databaseId?: number;
}

interface OrgUnit {
  id: string;
  displayName: string;
  parentId?: string;
  level?: number;
}

interface OrgUnitLevel {
  level: number;
  displayName: string;
  name: string;
}

interface OrgUnitGroup {
  id: string;
  displayName: string;
  organisationUnits?: OrgUnit[];
}

export default function WizardStepOrgUnits({
  wizardState,
  updateState,
  errors,
  databaseId,
}: StepOrgUnitsProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitLevels, setOrgUnitLevels] = useState<OrgUnitLevel[]>([]);
  const [orgUnitGroups, setOrgUnitGroups] = useState<OrgUnitGroup[]>([]);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [userOrgUnit, setUserOrgUnit] = useState(false);
  const [userSubUnits, setUserSubUnits] = useState(false);
  const [userSubX2Units, setUserSubX2Units] = useState(false);

  const fetchOrgUnits = useCallback(
    async (isMounted: boolean) => {
      setLoading(true);
      try {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata/?type=organisationUnits`,
        });
        if (!isMounted) return;
        const units = response.json?.result || [];
        setOrgUnits(units);
        if (units.length > 0) {
          setExpandedKeys([units[0]?.id || '']);
        }
      } catch {
        // Silently handle errors
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    },
    [databaseId],
  );

  const fetchOrgUnitLevels = useCallback(
    async (isMounted: boolean) => {
      try {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata/?type=organisationUnitLevels`,
        });
        if (!isMounted) return;
        const levels = response.json?.result || [];
        setOrgUnitLevels(levels);
      } catch {
        // Silently handle errors
      }
    },
    [databaseId],
  );

  const fetchOrgUnitGroups = useCallback(
    async (isMounted: boolean) => {
      try {
        const response = await SupersetClient.get({
          endpoint: `/api/v1/database/${databaseId}/dhis2_metadata/?type=organisationUnitGroups`,
        });
        if (!isMounted) return;
        const groups = response.json?.result || [];
        setOrgUnitGroups(groups);
      } catch {
        // Silently handle errors
      }
    },
    [databaseId],
  );

  useEffect(() => {
    let isMounted = true;

    if (databaseId) {
      const load = async () => {
        if (isMounted) await fetchOrgUnits(isMounted);
        if (isMounted) await fetchOrgUnitLevels(isMounted);
        if (isMounted) await fetchOrgUnitGroups(isMounted);
      };
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [databaseId, fetchOrgUnits, fetchOrgUnitLevels, fetchOrgUnitGroups]);

  const buildTreeData = (units: OrgUnit[]) => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    units.forEach(unit => {
      const node = {
        title: unit.displayName,
        key: unit.id,
        data: unit,
        children: [],
      };
      map.set(unit.id, node);
    });

    units.forEach(unit => {
      const node = map.get(unit.id);
      if (!node) return;
      if (unit.parentId) {
        const parent = map.get(unit.parentId);
        if (parent) {
          parent.children.push(node);
          return;
        }
      }
      roots.push(node);
    });

    return roots;
  };

  const filteredUnits = useMemo(() => {
    let filtered = orgUnits;

    if (selectedGroup) {
      const group = orgUnitGroups.find(g => g.id === selectedGroup) as
        | (OrgUnitGroup & { organisationUnits?: OrgUnit[] })
        | undefined;
      const members = group?.organisationUnits || [];
      const memberIds = new Set(members.map(m => m.id));
      if (memberIds.size > 0) {
        filtered = filtered.filter(unit => memberIds.has(unit.id));
      }
    }

    if (searchText) {
      filtered = filtered.filter(unit =>
        unit.displayName.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (selectedLevel) {
      filtered = filtered.filter(
        unit => unit.level?.toString() === selectedLevel,
      );
    }

    return filtered;
  }, [orgUnits, orgUnitGroups, searchText, selectedGroup, selectedLevel]);

  useEffect(() => {
    setUserOrgUnit(wizardState.orgUnits.includes('USER_ORGUNIT'));
    setUserSubUnits(wizardState.orgUnits.includes('USER_ORGUNIT_CHILDREN'));
    setUserSubX2Units(
      wizardState.orgUnits.includes('USER_ORGUNIT_GRANDCHILDREN'),
    );
  }, [wizardState.orgUnits]);

  const treeData = useMemo(() => buildTreeData(filteredUnits), [filteredUnits]);

  const levelOptions = useMemo(
    () =>
      orgUnitLevels.map(level => ({
        value: level.level.toString(),
        label: level.displayName,
      })),
    [orgUnitLevels],
  );

  const groupOptions = useMemo(
    () =>
      orgUnitGroups.map(group => ({
        value: group.id,
        label: group.displayName,
      })),
    [orgUnitGroups],
  );

  return (
    <StepContainer>
      <div>
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
          Organisation Units
        </Title>
        <Paragraph style={{ margin: 0 }}>
          Choose the geographic areas/organization units for your dataset.
        </Paragraph>
      </div>

      <OptionsContainer>
        <SectionTitle>User organisation unit options</SectionTitle>
        <CheckboxGroup>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={userOrgUnit}
              onChange={e => {
                setUserOrgUnit(e.target.checked);
                if (e.target.checked) {
                  const updated = [...wizardState.orgUnits];
                  if (!updated.includes('USER_ORGUNIT')) {
                    updated.push('USER_ORGUNIT');
                  }
                  updateState({ orgUnits: updated });
                } else {
                  const updated = wizardState.orgUnits.filter(
                    id => id !== 'USER_ORGUNIT',
                  );
                  updateState({ orgUnits: updated });
                }
              }}
            />
            <Text>User organisation unit</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={userSubUnits}
              onChange={e => {
                setUserSubUnits(e.target.checked);
                if (e.target.checked) {
                  const updated = [...wizardState.orgUnits];
                  if (!updated.includes('USER_ORGUNIT_CHILDREN')) {
                    updated.push('USER_ORGUNIT_CHILDREN');
                  }
                  updateState({ orgUnits: updated });
                } else {
                  const updated = wizardState.orgUnits.filter(
                    id => id !== 'USER_ORGUNIT_CHILDREN',
                  );
                  updateState({ orgUnits: updated });
                }
              }}
            />
            <Text>User sub-units</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={userSubX2Units}
              onChange={e => {
                setUserSubX2Units(e.target.checked);
                if (e.target.checked) {
                  const updated = [...wizardState.orgUnits];
                  if (!updated.includes('USER_ORGUNIT_GRANDCHILDREN')) {
                    updated.push('USER_ORGUNIT_GRANDCHILDREN');
                  }
                  updateState({ orgUnits: updated });
                } else {
                  const updated = wizardState.orgUnits.filter(
                    id => id !== 'USER_ORGUNIT_GRANDCHILDREN',
                  );
                  updateState({ orgUnits: updated });
                }
              }}
            />
            <Text>User sub-x2-units</Text>
          </div>
        </CheckboxGroup>
      </OptionsContainer>

      <OptionsContainer>
        <SectionTitle>Data scope</SectionTitle>
        <Paragraph
          style={{
            margin: '0 0 12px 0',
            fontSize: 12,
            color: theme.colorTextSecondary,
          }}
        >
          Choose which organization unit levels to include in the data export
        </Paragraph>
        <Radio.Group
          value={wizardState.dataLevelScope || 'selected'}
          onChange={e => {
            const scope = e.target.value as
              | 'selected'
              | 'children'
              | 'grandchildren'
              | 'all_levels';
            updateState({
              dataLevelScope: scope,
              includeChildren: scope !== 'selected',
            });
          }}
        >
          <div
            style={{
              marginBottom: 16,
              padding: '12px',
              backgroundColor: theme.colorBgContainer,
              borderRadius: 4,
            }}
          >
            <Radio value="selected">
              <Text style={{ fontWeight: 500 }}>
                Selected units only (current level only)
              </Text>
            </Radio>
            <div
              style={{
                marginLeft: 24,
                marginTop: 8,
                fontSize: 12,
                color: theme.colorTextSecondary,
              }}
            >
              Shows data for the exact organization units you select
            </div>
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: '12px',
              backgroundColor: theme.colorBgContainer,
              borderRadius: 4,
            }}
          >
            <Radio value="children">
              <Text style={{ fontWeight: 500 }}>
                Include children (one level down)
              </Text>
            </Radio>
            <div
              style={{
                marginLeft: 24,
                marginTop: 8,
                fontSize: 12,
                color: theme.colorTextSecondary,
              }}
            >
              Includes all direct children of selected units (e.g., Districts if
              you select a Region)
            </div>
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: '12px',
              backgroundColor: theme.colorBgContainer,
              borderRadius: 4,
            }}
          >
            <Radio value="grandchildren">
              <Text style={{ fontWeight: 500 }}>
                Include grandchildren (two levels down)
              </Text>
            </Radio>
            <div
              style={{
                marginLeft: 24,
                marginTop: 8,
                fontSize: 12,
                color: theme.colorTextSecondary,
              }}
            >
              Includes all descendants up to two levels below (e.g.,
              Sub-counties if you select a Region)
            </div>
          </div>

          <div
            style={{
              marginBottom: 0,
              padding: '12px',
              backgroundColor: theme.colorBgContainer,
              borderRadius: 4,
            }}
          >
            <Radio value="all_levels">
              <Text style={{ fontWeight: 500 }}>
                All levels (facility level)
              </Text>
            </Radio>
            <div
              style={{
                marginLeft: 24,
                marginTop: 8,
                fontSize: 12,
                color: theme.colorTextSecondary,
              }}
            >
              Includes all descendants down to the lowest level (e.g., all
              Health Facilities)
            </div>
          </div>
        </Radio.Group>
      </OptionsContainer>

      <ContentSection>
        <div>
          <SectionTitle style={{ marginBottom: 12 }}>
            Select organisation units
          </SectionTitle>
          <Input.Search
            placeholder="Search organizations..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            size="large"
          />
        </div>

        <FiltersRow gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <div>
              <SectionTitle>Filter by level</SectionTitle>
              <Select
                allowClear
                placeholder="Select a level"
                value={selectedLevel}
                onChange={value => setSelectedLevel(value as string | null)}
                options={levelOptions}
                showSearch
                optionFilterProps={['label']}
                styles={{ root: { width: '100%' } }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div>
              <SectionTitle>Filter by group</SectionTitle>
              <Select
                allowClear
                placeholder="Select a group"
                value={selectedGroup}
                onChange={value => setSelectedGroup(value as string | null)}
                options={groupOptions}
                showSearch
                optionFilterProps={['label']}
                styles={{ root: { width: '100%' } }}
              />
            </div>
          </Col>
        </FiltersRow>

        {errors.orgUnits && <ErrorText>{errors.orgUnits}</ErrorText>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loading />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            description={
              searchText ? 'No organization units found' : 'No units available'
            }
            style={{ marginTop: 40 }}
          />
        ) : (
          <TreeContainer>
            <Tree
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={keys => setExpandedKeys(keys as string[])}
              checkedKeys={wizardState.orgUnits.filter(
                id => !id.startsWith('USER_ORGUNIT'),
              )}
              onCheck={keys => {
                const userOrgUnitIds = wizardState.orgUnits.filter(id =>
                  id.startsWith('USER_ORGUNIT'),
                );
                updateState({
                  orgUnits: [...(keys as string[]), ...userOrgUnitIds],
                });
              }}
              checkable
              showIcon
            />
          </TreeContainer>
        )}
      </ContentSection>

      {wizardState.orgUnits.length > 0 && (
        <SelectedSummary>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong>
                <Badge
                  count={wizardState.orgUnits.length}
                  style={{ backgroundColor: theme.colorPrimary }}
                />
                <span style={{ marginLeft: 8 }}>Selected Units</span>
              </Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {wizardState.orgUnits.map(id => {
                const displayName =
                  id === 'USER_ORGUNIT'
                    ? 'User organisation unit'
                    : id === 'USER_ORGUNIT_CHILDREN'
                      ? 'User sub-units'
                      : id === 'USER_ORGUNIT_GRANDCHILDREN'
                        ? 'User sub-x2-units'
                        : orgUnits.find(ou => ou.id === id)?.displayName || id;
                return (
                  <Tag
                    key={id}
                    closable
                    onClose={() => {
                      const updated = wizardState.orgUnits.filter(
                        uid => uid !== id,
                      );
                      updateState({ orgUnits: updated });
                      if (id === 'USER_ORGUNIT') setUserOrgUnit(false);
                      if (id === 'USER_ORGUNIT_CHILDREN')
                        setUserSubUnits(false);
                      if (id === 'USER_ORGUNIT_GRANDCHILDREN')
                        setUserSubX2Units(false);
                    }}
                    color={
                      id === 'USER_ORGUNIT' ||
                      id === 'USER_ORGUNIT_CHILDREN' ||
                      id === 'USER_ORGUNIT_GRANDCHILDREN'
                        ? 'blue'
                        : 'green'
                    }
                  >
                    {displayName}
                  </Tag>
                );
              })}
            </div>
          </div>
          <div
            style={{
              paddingTop: 12,
              borderTop: `1px solid ${theme.colorBorder}`,
            }}
          >
            <Text>
              <strong>Data scope:</strong>{' '}
              {wizardState.dataLevelScope === 'children'
                ? 'Include children (one level down)'
                : wizardState.dataLevelScope === 'grandchildren'
                  ? 'Include grandchildren (two levels down)'
                  : wizardState.dataLevelScope === 'all_levels'
                    ? 'All levels (facility level)'
                    : 'Selected units only'}
            </Text>
          </div>
        </SelectedSummary>
      )}

      {wizardState.orgUnits.length > 0 && (
        <Button
          type="primary"
          danger
          block
          onClick={() => {
            setUserOrgUnit(false);
            setUserSubUnits(false);
            setUserSubX2Units(false);
            updateState({ orgUnits: [] });
          }}
        >
          Clear All
        </Button>
      )}
    </StepContainer>
  );
}
