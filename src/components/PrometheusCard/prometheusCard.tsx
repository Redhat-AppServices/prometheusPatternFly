import React from 'react';

export interface PrometheusCardProps {
    title?: string;
}

export const PrometheusCard: React.FunctionComponent<PrometheusCardProps> = ({
children,
...props
}) => {}