import React from 'react';

export interface PrometheusChartProps {
    formatSeriesTitle: (label: string) => void;
    graphType: 'line' | 'area';
    queries: string[];
    showLegend?: boolean;
    showStackedControl?: boolean;
    title?: string;
    timespan: number;
    pollInterval: number;
}

export const PrometheusChart: React.FunctionComponent<PrometheusChartProps> = ({
children,
...props
}) => {}