/*
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

import { buildQueryContext, QueryFormData } from '@superset-ui/core';
import { sanitizeDHIS2ColumnName } from '../../features/datasets/AddDataset/DHIS2ParameterBuilder/sanitize';

export default function buildQuery(formData: QueryFormData) {
  const {
    metric,
    tooltip_columns = [],
    granularity_sqla,
    org_unit_column,
    boundary_levels,
    boundary_level,
  } = formData;

  return buildQueryContext(formData, baseQueryObject => {
    // Check if this is a DHIS2 dataset by looking at the datasource SQL
    // For DHIS2 datasets, we don't execute SQL through the standard chart API
    // Instead, DHIS2Map will fetch data via DHIS2DataLoader
    const datasourceSql = (baseQueryObject as any)?.datasource?.sql || '';
    const isDHIS2Dataset =
      datasourceSql.includes('/* DHIS2:') ||
      datasourceSql.includes('-- DHIS2:');

    // eslint-disable-next-line no-console
    console.log('[DHIS2Map buildQuery] Dataset type:', {
      isDHIS2Dataset,
      hasSQL: !!datasourceSql,
      sqlPreview: datasourceSql.substring(0, 100),
    });

    // For DHIS2 datasets, return minimal query - data will be fetched via DHIS2DataLoader
    if (isDHIS2Dataset) {
      // Determine the selected boundary level for hierarchy column selection
      let selectedLevel = 2;
      if (Array.isArray(boundary_levels) && boundary_levels.length > 0) {
        selectedLevel = Math.min(...boundary_levels);
      } else if (boundary_level) {
        selectedLevel = Array.isArray(boundary_level) ? boundary_level[0] : boundary_level;
      }
      
      // eslint-disable-next-line no-console
      console.log(
        '[DHIS2Map buildQuery] DHIS2 dataset detected - ' +
          'returning minimal query for component-level data fetching',
        { selectedLevel, boundary_levels, boundary_level },
      );
      return [
        {
          ...baseQueryObject,
          // Return empty query - DHIS2Map will fetch data via DHIS2DataLoader
          groupby: [],
          metrics: [],
          row_limit: 0,
          // Mark this as a DHIS2 query so we know to skip chart API execution
          is_dhis2: true,
          // Pass the selected boundary level so data loading can fetch appropriate org units
          dhis2_boundary_level: selectedLevel,
          dhis2_boundary_levels: boundary_levels || [selectedLevel],
        },
      ];
    }

    // For non-DHIS2 datasets, use standard query building
    // Get the metric - could be a string column name or a metric object
    let metricColumn =
      typeof metric === 'string'
        ? metric
        : (metric as any)?.column?.column_name ||
          (metric as any)?.label ||
          (metric as any)?.expressionType ||
          'value';

    // Extract column name from SQL aggregate functions like SUM(column_name)
    const sqlAggPattern =
      /^(SUM|AVG|COUNT|MIN|MAX|STDDEV|VARIANCE)\s*\(\s*([^)]+)\s*\)$/i;
    const sqlMatch = metricColumn.match(sqlAggPattern);
    if (sqlMatch) {
      // Use just the column name, not the SUM() wrapper
      metricColumn = sqlMatch[2].trim();
    }

    // Sanitize the metric name to match backend column naming
    const sanitizedMetric = sanitizeDHIS2ColumnName(metricColumn);

    // Sanitize org_unit_column if provided
    const sanitizedOrgUnitColumn = org_unit_column
      ? sanitizeDHIS2ColumnName(org_unit_column)
      : undefined;

    // Sanitize tooltip columns
    const sanitizedTooltipColumns = (tooltip_columns || []).map((col: any) => {
      const colString =
        typeof col === 'string' ? col : col?.label || col?.name || String(col);
      return sanitizeDHIS2ColumnName(colString);
    });

    // Build columns array - request all needed columns as dimensions
    const columns: string[] = [];

    // Always include OrgUnit column if specified (for location mapping)
    if (sanitizedOrgUnitColumn) {
      columns.push(sanitizedOrgUnitColumn);
    }

    // Always include Period if available (time/granularity column)
    if (granularity_sqla) {
      columns.push(sanitizeDHIS2ColumnName(granularity_sqla));
    }

    // Add tooltip columns
    if (sanitizedTooltipColumns && sanitizedTooltipColumns.length > 0) {
      columns.push(...sanitizedTooltipColumns);
    }

    // Add the metric column to columns (for DHIS2 we want raw data, not aggregated)
    if (sanitizedMetric && !columns.includes(sanitizedMetric)) {
      columns.push(sanitizedMetric);
    }

    // eslint-disable-next-line no-console
    console.log('[DHIS2Map buildQuery] Building query with:', {
      originalMetric: metricColumn,
      sanitizedMetric,
      sanitizedOrgUnitColumn,
      columns,
      granularity: granularity_sqla,
      tooltip_columns: sanitizedTooltipColumns,
      row_limit: baseQueryObject.row_limit,
    });

    // For DHIS2 datasets, request raw data with proper column names
    // Use groupby/columns for dimension-based queries
    // IMPORTANT: Don't add metric to both groupby AND metrics - this causes
    // "Duplicate column/metric labels" error in query validation
    return [
      {
        ...baseQueryObject,
        // Request all needed columns as groupby dimensions (includes metric)
        groupby: columns,
        // Don't duplicate metric in metrics array - it's already in groupby
        // Setting metrics to empty array for raw data retrieval
        metrics: [],
        // Use a reasonable row limit (0 means unlimited which can cause issues)
        row_limit: baseQueryObject.row_limit || 10000,
        // Disable time range filtering if not needed for DHIS2
        time_range: baseQueryObject.time_range || 'No filter',
      },
    ];
  });
}
