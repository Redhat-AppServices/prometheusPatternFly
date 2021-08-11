import React from 'react';
import './App.css';
import {
  Avatar,
  Brand,
  Page,
  PageHeader,
  PageHeaderTools,
  PageSection,
  PageSectionVariants,
  PageSidebar,
} from '@patternfly/react-core';
import imgAvatar from './assets/images/imgAvatar.svg';
import imgBrand from './assets/images/imgBrand.svg';
import { GraphTypes, PrometheusCard, PrometheusChart } from '@app-data-services/prometheus-pf';

const App = () => {
  const AppToolbar = (
    <PageHeaderTools>
      <Avatar src={imgAvatar} alt="Avatar image" />
    </PageHeaderTools>
  );

  const AppHeader = (
    <PageHeader
      logo={<Brand src={imgBrand} alt="Patternfly Logo" data-quickstart-id="logo" />}
      headerTools={AppToolbar}
      showNavToggle
      isNavOpen
    />
  );

  const SideBar = (
    <PageSidebar aria-label="Nav" nav="navigation" />
  );

  const fetchOptions = {
    basePath: 'http://localhost:9090',
    queries: ["rate(node_cpu_seconds_total{mode='system'}[1m])"]
  };

  return (
    <Page isManagedSidebar header={AppHeader} sidebar={SideBar}>
      <PageSection variant={PageSectionVariants.default}>
        <PrometheusCard title="CPU usage">
          <PrometheusChart
            fetchOptions={fetchOptions}
            defaultSamples={60}
            pollInterval={30*1000}
            graphType={GraphTypes.area}
            formatSeriesTitle={(labels) => `cpu${labels.cpu}`}
            threshold={1.6}
            showLegend
          />
        </PrometheusCard>
      </PageSection>
    </Page>
  );
}

export default App;
