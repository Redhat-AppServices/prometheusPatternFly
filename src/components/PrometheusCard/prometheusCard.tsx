import React from 'react';
import { Card, CardBody, CardTitle } from '@patternfly/react-core';

export interface PrometheusCardProps {
    title?: string;
}

export enum GraphTypes {
    area = 'Area',
    line = 'Line',
}

export const PrometheusCard: React.FunctionComponent<PrometheusCardProps> = ({
title,
children,
}) => (
    <Card>
        <CardTitle>{title}</CardTitle>
        <CardBody>{children}</CardBody>
    </Card>
);