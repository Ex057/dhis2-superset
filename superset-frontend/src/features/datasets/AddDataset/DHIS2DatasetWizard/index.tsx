import { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { t, styled, SupersetClient, logging } from '@superset-ui/core';
import {
  Button,
  Steps,
  Typography,
  Space,
  Divider,
  Loading,
} from '@superset-ui/core/components';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import {
  DatasetObject,
  DSReducerActionType,
  DatasetActionType,
} from '../types';
import { sanitizeDHIS2ColumnName } from '../DHIS2ParameterBuilder/sanitize';
import WizardStepInfo from './steps/StepInfo';
import WizardStepDataElements from './steps/StepDataElements';
import WizardStepPeriods from './steps/StepPeriods';
import WizardStepOrgUnits from './steps/StepOrgUnits';
import WizardStepDataPreview from './steps/StepDataPreview';
import WizardStepSave from './steps/StepSave';

const { Title, Text, Paragraph } = Typography;

const WizardContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${theme.colorBgBase};
  `}
`;

const StepsWrapper = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 3}px;
    background: ${theme.colorBgElevated};
    border-bottom: 1px solid ${theme.colorBorder};
  `}
`;

const ContentWrapper = styled.div`
  ${({ theme }) => `
    flex: 1;
    padding: ${theme.sizeUnit * 4}px;
    overflow-y: auto;
    background: ${theme.colorBgBase};
  `}
`;

const FooterWrapper = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 3}px;
    background: ${theme.colorBgElevated};
    border-top: 1px solid ${theme.colorBorder};
    display: flex;
    justify-content: space-between;
    align-items: center;
  `}
`;

const ButtonGroup = styled(Space)`
  display: flex;
  gap: 12px;
`;

const StepContent = styled.div`
  min-height: 400px;
`;

const ProgressBar = styled.div`
  ${({ theme }) => `
    margin-bottom: ${theme.sizeUnit * 2}px;
    font-size: 14px;
    color: ${theme.colorTextSecondary};
  `}
`;

export interface DHIS2WizardState {
  datasetName: string;
  description: string;
  dataElements: string[];
  periods: string[];
  orgUnits: string[];
  includeChildren: boolean;
  dataLevelScope?: 'selected' | 'children' | 'grandchildren' | 'all_levels';
  columns: Array<{
    name: string;
    type: string;
    verbose_name?: string;
    is_dttm?: boolean;
  }>;
  previewData: any[];
}

interface DHIS2DatasetWizardProps {
  dataset: Partial<DatasetObject> | null;
  setDataset: (action: DSReducerActionType) => void;
  hasColumns: boolean;
  setHasColumns: (value: boolean) => void;
  datasets: string[] | undefined;
  onSaveSuccess?: () => void;
}

const WIZARD_STEPS = [
  {
    key: 'info',
    title: t('Dataset Info'),
    description: t('Basic information'),
  },
  {
    key: 'data_elements',
    title: t('Data Elements'),
    description: t('Select DE'),
  },
  { key: 'periods', title: t('Time Periods'), description: t('Select PE') },
  {
    key: 'org_units',
    title: t('Organization Units'),
    description: t('Select OU'),
  },
  {
    key: 'data_preview',
    title: t('Data Preview'),
    description: t('Preview data'),
  },
  { key: 'save', title: t('Save Dataset'), description: t('Complete setup') },
];

const generateUniqueDatasetName = (
  tableName: string | null | undefined,
): string => {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  const base = tableName || 'DHIS2 Dataset';
  return `${base} ${timestamp}-${randomNum}`;
};

export default function DHIS2DatasetWizard({
  dataset,
  setDataset,
  setHasColumns,
  datasets,
  onSaveSuccess,
}: DHIS2DatasetWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { addSuccessToast, addDangerToast } = useToasts();
  const [wizardState, setWizardState] = useState<DHIS2WizardState>({
    datasetName: generateUniqueDatasetName(dataset?.table_name),
    description: '',
    dataElements: [],
    periods: [],
    orgUnits: [],
    includeChildren: false,
    columns: dataset?.dhis2_columns || [],
    previewData: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Record<string, string> = {};

      switch (step) {
        case 0:
          if (!wizardState.datasetName.trim()) {
            newErrors.datasetName = t('Dataset name is required');
          }
          if (datasets?.includes(wizardState.datasetName)) {
            newErrors.datasetName = t('Dataset name already exists');
          }
          break;
        case 1:
          if (wizardState.dataElements.length === 0) {
            newErrors.dataElements = t(
              'At least one data element must be selected',
            );
          }
          break;
        case 2:
          if (wizardState.periods.length === 0) {
            newErrors.periods = t('At least one period must be selected');
          }
          break;
        case 3:
          if (wizardState.orgUnits.length === 0) {
            newErrors.orgUnits = t(
              'At least one organization unit must be selected',
            );
          }
          break;
        default:
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [wizardState, datasets],
  );

  const handleNextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const history = useHistory();

  const updateWizardState = useCallback(
    (updates: Partial<DHIS2WizardState>) => {
      setWizardState(prev => ({ ...prev, ...updates }));
    },
    [],
  );

  const parseSourceTable = (datasetName: string | null | undefined): string => {
    if (!datasetName) return 'analytics';
    const match = datasetName.match(/^([a-zA-Z]+)/);
    return match ? match[1] : 'analytics';
  };

  const handleSave = useCallback(async () => {
    if (!dataset?.db?.id) {
      addDangerToast(t('Database not selected'));
      return;
    }

    setLoading(true);
    try {
      const dataLevelScope = wizardState.dataLevelScope || 'selected';
      const dhis2Params: Record<string, string> = {
        dx: wizardState.dataElements.join(';'),
        pe: wizardState.periods.join(';'),
        ou: wizardState.orgUnits.join(';'),
      };

      if (dataLevelScope !== 'selected') {
        dhis2Params.dataLevelScope = dataLevelScope;
        dhis2Params.ouMode = 'DESCENDANTS';
      }

      const sourceTable = parseSourceTable(wizardState.datasetName);

      const paramsStr = Object.entries(dhis2Params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      const sql = `SELECT * FROM ${sourceTable}\n/* DHIS2: table=${sourceTable}&${paramsStr} */`;

      logging.info('[DHIS2 Wizard] Creating dataset:', wizardState.datasetName);
      logging.info('[DHIS2 Wizard] SQL:', sql);

      const response = await SupersetClient.post({
        endpoint: '/api/v1/dataset/',
        jsonPayload: {
          database: dataset.db.id,
          catalog: dataset.catalog || null,
          schema: dataset.schema || null,
          table_name: wizardState.datasetName,
          sql,
        },
      });

      const result = response.json;
      logging.info('[DHIS2 Wizard] Dataset created:', result);

      if (result?.id) {
        // Save columns directly to the dataset via PUT API
        logging.info('[DHIS2 Wizard] Saving columns to dataset:', {
          datasetId: result.id,
          columnCount: wizardState.columns.length,
          columns: wizardState.columns,
        });

        try {
          // Transform wizard columns to dataset column schema format
          // Use sanitized verbose_name as column_name for human-readable database columns
          // This ensures columns like "National", "Region", "Malaria_Total" instead of "ou_level_1", "de_xxx"
          const datasetColumns = wizardState.columns.map((col, index) => {
            // Use verbose_name (display name) as the base for column_name
            // Fall back to col.name if verbose_name is not available
            const displayName = col.verbose_name || col.name;
            const sanitizedColumnName = sanitizeDHIS2ColumnName(displayName);

            return {
              column_name: sanitizedColumnName,
              type: col.type || 'STRING',
              verbose_name: displayName,
              is_dttm: col.is_dttm || false,
              filterable: true,
              groupby: true,
              is_active: true,
            };
          });

          logging.info(
            '[DHIS2 Wizard] Transformed columns for API:',
            datasetColumns,
          );

          await SupersetClient.put({
            endpoint: `/api/v1/dataset/${result.id}`,
            jsonPayload: {
              columns: datasetColumns,
            },
          });
          logging.info('[DHIS2 Wizard] Columns saved successfully');
        } catch (columnError) {
          logging.error('[DHIS2 Wizard] Failed to save columns:', columnError);
          // Continue anyway - the dataset was created
        }

        addSuccessToast(t('Dataset created successfully!'));

        setDataset({
          type: DatasetActionType.ChangeDataset,
          payload: { name: 'table_name', value: wizardState.datasetName },
        });

        setDataset({
          type: DatasetActionType.SetDHIS2Parameters,
          payload: { parameters: dhis2Params },
        });


        setDataset({
          type: DatasetActionType.SetDHIS2Columns,
          payload: { columns: wizardState.columns },
        });

        setHasColumns(true);

        if (onSaveSuccess) {
          onSaveSuccess();
        } else {
          history.push(`/chart/add/?dataset=${wizardState.datasetName}`);
        }
      } else {
        addDangerToast(t('Failed to create dataset - no ID returned'));
      }
    } catch (error: any) {
      logging.error('[DHIS2 Wizard] Save error:', error);
      const errorMessage =
        error?.message || error?.body?.message || t('Failed to create dataset');
      addDangerToast(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    wizardState,
    dataset,
    setDataset,
    setHasColumns,
    onSaveSuccess,
    history,
    addSuccessToast,
    addDangerToast,
  ]);

  const currentStepConfig = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <WizardStepInfo
            wizardState={wizardState}
            updateState={updateWizardState}
            errors={errors}
            dataset={dataset}
          />
        );
      case 1:
        return (
          <WizardStepDataElements
            wizardState={wizardState}
            updateState={updateWizardState}
            errors={errors}
            databaseId={dataset?.db?.id}
          />
        );
      case 2:
        return (
          <WizardStepPeriods
            wizardState={wizardState}
            updateState={updateWizardState}
            errors={errors}
            databaseId={dataset?.db?.id}
          />
        );
      case 3:
        return (
          <WizardStepOrgUnits
            wizardState={wizardState}
            updateState={updateWizardState}
            errors={errors}
            databaseId={dataset?.db?.id}
          />
        );
      case 4:
        console.log(
          '[DHIS2Wizard] Rendering DataPreview step with includeChildren:',
          wizardState.includeChildren,
        );
        return (
          <WizardStepDataPreview
            wizardState={wizardState}
            updateState={updateWizardState}
            databaseId={dataset?.db?.id}
            endpoint={dataset?.table_name}
            dataElements={wizardState.dataElements}
            periods={wizardState.periods}
            orgUnits={wizardState.orgUnits}
            includeChildren={wizardState.includeChildren}
          />
        );
      case 5:
        return (
          <WizardStepSave
            wizardState={wizardState}
            dataset={dataset}
            handleSave={handleSave}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardContainer>
      <StepsWrapper>
        <Title level={3} style={{ marginBottom: 0 }}>
          {t('DHIS2 Dataset Creator')}
        </Title>
        <Paragraph style={{ marginBottom: 16, marginTop: 8, opacity: 0.7 }}>
          {t('Follow the steps below to create a new DHIS2 dataset')}
        </Paragraph>
        <Steps
          current={currentStep}
          onChange={handleStepChange}
          responsive
          items={WIZARD_STEPS.map((step, index) => ({
            ...step,
            status:
              index < currentStep
                ? 'finish'
                : index === currentStep
                  ? 'process'
                  : 'wait',
          }))}
        />
      </StepsWrapper>

      <ContentWrapper>
        <ProgressBar>
          {t('Step %d of %d', currentStep + 1, WIZARD_STEPS.length)}:{' '}
          {currentStepConfig?.title}
        </ProgressBar>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loading />
          </div>
        ) : (
          <StepContent>{renderStepContent()}</StepContent>
        )}
      </ContentWrapper>

      <Divider style={{ margin: 0 }} />

      <FooterWrapper>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('Step %d of %d', currentStep + 1, WIZARD_STEPS.length)}
        </Text>

        <ButtonGroup align="center">
          <Button onClick={handlePrevStep} disabled={isFirstStep} size="large">
            {t('Previous')}
          </Button>

          {!isLastStep ? (
            <Button
              type="primary"
              onClick={handleNextStep}
              size="large"
              loading={loading}
            >
              {t('Next')}
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSave}
              size="large"
              loading={loading}
              danger={false}
            >
              {t('Complete Setup')}
            </Button>
          )}
        </ButtonGroup>
      </FooterWrapper>
    </WizardContainer>
  );
}
