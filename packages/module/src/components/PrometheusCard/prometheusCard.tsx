import React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core";
import "./PrometheusCard.css";

export interface PrometheusCardProps {
  title?: string;
  children?: React.ReactNode;
}

export enum GraphTypes {
  area = "Area",
  line = "Line",
}

export const PrometheusCard: React.FunctionComponent<PrometheusCardProps> = ({
  title,
  children,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardBody>{children}</CardBody>
  </Card>
);
