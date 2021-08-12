import classNames from "classnames";
import React from "react";
import * as _ from "lodash-es";
import { GraphTypes } from "../PrometheusCard";
import {
  Chart,
  ChartAxis,
  ChartArea,
  ChartGroup,
  ChartLegend,
  ChartLine,
  ChartStack,
  ChartThemeColor,
  ChartVoronoiContainer,
  ChartThemeVariant,
  getCustomTheme,
  ChartThreshold,
} from "@patternfly/react-charts";
import { useRefWidth } from "../../utils/ref-width-hook";
import {
  dateTimeFormatterWithSeconds,
  parsePrometheusDuration,
  timeFormatter,
} from "../../utils/datetime";
import { VictoryPortal } from "victory-core";
import { usePoll } from "../../utils/poll-hook";
import { global_palette_black_300 as globalBlack300 } from "@patternfly/react-tokens/dist/js/global_palette_black_300";
import chart_color_black_500 from "@patternfly/react-tokens/dist/js/chart_color_black_500";
import { humanizeNumberSI } from "../../utils/humanize";

import "./PrometheusChart.css";
import {
  PrometheusEndpoint,
  getPrometheusURL,
} from "../../utils/get-prometheus-url";
export interface PrometheusChartProps {
  graphType: GraphTypes;
  fetchOptions: FetchOptions | (() => Promise<PrometheusResponse>);
  defaultSamples?: number;
  showLegend?: boolean;
  showStackedControl?: boolean;
  title?: string;
  timespan?: number;
  pollInterval?: number;
  threshold?: number;
  thresholdText?: string;
  formatSeriesTitle?: FormatSeriesTitle;
}
interface PrometheusChartGraphProps {
  allSeries: Series[][];
  span: number;
  width: number;
  isStack: boolean;
  showLegend?: boolean;
  thresholdData?: ThresholdData;
  formatSeriesTitle?: FormatSeriesTitle;
}

type FetchOptions = {
  basePath: string;
  queries: string[];
  options?: RequestInit;
};

type ThresholdData = {
  data?: GraphDataPoint[];
  threshold?: number;
  thresholdText?: string;
};
type FormatSeriesTitle = (labels: PrometheusLabels, i?: number) => string;
type PrometheusResult = {
  metric: PrometheusLabels;
  values?: PrometheusValue[];
  value?: PrometheusValue;
};
type PrometheusLabels = { [key: string]: string };
export type PrometheusValue = [number, string];
type PrometheusData = {
  resultType: "matrix" | "vector" | "scalar" | "string";
  result: PrometheusResult[];
};
type PrometheusResponse = {
  status: string;
  data: PrometheusData;
  errorType?: string;
  error?: string;
  warnings?: string[];
};
type GraphDataPoint = {
  x: Date;
  y: number | null;
};
type Series = [PrometheusLabels, GraphDataPoint[]] | [];
type GraphSeries = GraphDataPoint[] | undefined;

type TooltipProps = {
  activePoints?: { x: number; y: number; _y1?: number }[];
  center?: { x: number; y: number };
  height?: number;
  width?: number;
  x?: number;
  style?: { fill: string; name: string };
  threshold?: number;
  thresholdText?: string;
};

type LegendData = {
  name: string;
  symbol?: {
    fill?: string;
    type?: string;
  };
};

const pfDependentAxisTickLabels = {
  padding: 5,
  fontFamily: "var(--pf-chart-global--FontFamily)",
  letterSpacing: "var(--pf-chart-global--letter-spacing)",
  fill: "rgb(79, 82, 85)",
};
const pfIndependentAxisTickLabels = Object.assign(
  {},
  pfDependentAxisTickLabels,
  { padding: 2 }
);
const axisTicks = {
  size: 5,
  strokeWidth: 1,
  stroke: globalBlack300.value,
};

const prometheusChartTheme = {
  chart: {
    padding: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
  },
  dependentAxis: {
    style: {
      axis: {
        stroke: "none",
      },
      grid: {
        stroke: "#EDEDED",
      },
      tickLabels: pfDependentAxisTickLabels,
    },
  },
  independentAxis: {
    style: {
      ticks: axisTicks,
      tickLabels: pfIndependentAxisTickLabels,
      grid: {
        stroke: "none",
      },
    },
  },
};

const theme = getCustomTheme(
  ChartThemeColor.multiUnordered,
  ChartThemeVariant.light,
  prometheusChartTheme
);

const colors = theme.line?.colorScale;

// Min and max number of data samples per data series
const minSamples = 10;
const maxSamples = 300;

// Minimum step (milliseconds between data samples)
const minStep = 5 * 1000;

// Don't poll more often than this number of milliseconds
const minPollInterval = 10 * 1000;

// Get X axis domain base on the endTime and timespan
const getXDomain = (endTime: number, span: number): [number, number] => [
  endTime - span,
  endTime,
];

// Get Max sample number for the given span
const getMaxSamplesForSpan = (span: number) =>
  _.clamp(Math.round(span / minStep), minSamples, maxSamples);

// Format tooltip labels if formatSeriesTitle not provided
const formatLabels = (labels?: PrometheusLabels) => {
  const name = labels?.__name__ ?? "";
  const otherLabels = _.omit(labels, "__name__");
  return `${name}{${_.map(otherLabels, (v, k) => `${k}=${v}`).join(",")}}`;
};

// Use exponential notation for small or very large numbers to avoid labels with too many characters
const formatPositiveValue = (v: number): string =>
  v === 0 || (0.001 <= v && v < 1e23)
    ? humanizeNumberSI(v).string
    : v.toExponential(1);
const formatValue = (v: number): string =>
  (v < 0 ? "-" : "") + formatPositiveValue(Math.abs(v));

const formatSeriesValues = (
  values: PrometheusValue[],
  samples: number,
  span: number
): GraphDataPoint[] => {
  const newValues = _.map(values, (v) => {
    const y = Number(v[1]);
    return {
      x: new Date(v[0] * 1000),
      y: Number.isNaN(y) ? null : y,
    };
  });

  // The data may have missing values, so we fill those gaps with nulls so that the graph correctly
  // shows the missing values as gaps in the line
  const start = Number(_.get(newValues, "[0].x"));
  const end = Number(_.get(_.last(newValues), "x"));
  const step = span / samples;
  _.range(start, end, step).forEach((t, i) => {
    const x = new Date(t);
    if (_.get(newValues, [i, "x"]) > x) {
      newValues.splice(i, 0, { x, y: null });
    }
  });

  return newValues;
};

const getThresholdData = (
  threshold: number,
  span: number,
  end: number
): GraphDataPoint[] => {
  const newThresholdData: GraphDataPoint[] = [];
  const start = end - span;
  newThresholdData.push({ x: new Date(start), y: threshold });
  newThresholdData.push({ x: new Date(end), y: threshold });
  return newThresholdData;
};

const TOOLTIP_MAX_ENTRIES = 20;
const TOOLTIP_MAX_WIDTH = 300;
const TOOLTIP_MAX_HEIGHT = 400;

// For performance, use this instead of PatternFly's ChartTooltip or Victory VictoryTooltip
const Tooltip: React.FC<TooltipProps> = ({
  activePoints,
  center,
  height,
  style,
  width,
  x,
  threshold,
  thresholdText,
}) => {
  const time = activePoints?.[0]?.x;

  if (!activePoints || !center || !height || !width || !style || !x) {
    return null;
  }

  if (!_.isDate(time) || !_.isFinite(x)) {
    return null;
  }

  // Don't show the tooltip if the cursor is too far from the active points (can happen when the
  // graph's timespan includes a range with no data)
  if (Math.abs(x - center.x) > width / 15) {
    return null;
  }

  // Don't show the tooltip is the cursor is out of the graph (can happen when cursor is on the legend area)
  // because chart padding-top is 25 and padding bottom is 110
  if (height - center.y <= 110 || center.y <= 25) {
    return null;
  }

  // Pick tooltip width and location (left or right of the cursor) to maximize its available space
  const tooltipMaxWidth = Math.min(width / 2 + 60, TOOLTIP_MAX_WIDTH);
  const isOnLeft = x > (width - 40) / 2;

  const allSeries = activePoints
    .map((point, i) => ({
      color: style[i]?.fill,
      name: style[i]?.name,
      total: point._y1 ?? point.y,
      value: point.y,
    }))
    // For stacked graphs, this filters out data series that have no data or no name (threshold) for this timestamp
    .filter(({ value, name }) => value !== null && name !== undefined)
    .sort((a, b) => b.total - a.total)
    .slice(0, TOOLTIP_MAX_ENTRIES);

  return (
    // Make sure the <line> element is in the area of graph, set y1 to 25, the same as chart padding-top
    // and set y2 to height-110, the same as chart padding-bottom
    <>
      <VictoryPortal>
        <foreignObject
          height={TOOLTIP_MAX_HEIGHT}
          width={tooltipMaxWidth}
          x={isOnLeft ? x - tooltipMaxWidth : x}
          y={center.y - TOOLTIP_MAX_HEIGHT / 2}
        >
          <div
            className={classNames("prometheus-chart__tooltip-wrap", {
              "prometheus-chart__tooltip-wrap--left": isOnLeft,
            })}
          >
            <div className="prometheus-chart__tooltip-arrow" />
            <div className="prometheus-chart__tooltip">
              <div className="prometheus-chart__tooltip-group">
                <div className="prometheus-chart__tooltip-time">
                  {threshold
                    ? thresholdText
                      ? `${thresholdText}: ${formatValue(threshold)}`
                      : `Limit: ${formatValue(threshold)}`
                    : dateTimeFormatterWithSeconds.format(time)}
                </div>
              </div>
              {allSeries.map((s, i) => (
                <div className="prometheus-chart__tooltip-group" key={i}>
                  <div
                    className="prometheus-chart__series-btn"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="nowrap truncate">{s.name}</div>
                  <div className="prometheus-chart__tooltip-value">
                    {formatValue(s.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </foreignObject>
      </VictoryPortal>
      <line
        className="prometheus-chart__tooltip-line"
        x1={x}
        x2={x}
        y1="25"
        y2={height - 110}
      />
    </>
  );
};

export const PrometheusChart: React.FunctionComponent<PrometheusChartProps> = ({
  fetchOptions,
  defaultSamples,
  timespan,
  graphType,
  showLegend,
  pollInterval,
  threshold,
  thresholdText,
  formatSeriesTitle,
}) => {
  const [span, setSpan] = React.useState(timespan || parsePrometheusDuration("30m"));
  const [graphData, setGraphData] = React.useState<Series[][]>([]);
  const [thresholdData, setThresholdData] = React.useState<ThresholdData>();
  // Limit the number of samples so that the step size doesn't fall below minStep
  const maxSamplesForSpan = defaultSamples || getMaxSamplesForSpan(span);
  const [samples, setSamples] = React.useState(maxSamplesForSpan);
  const [containerRef, width] = useRefWidth();

  React.useEffect(() => {
    if (timespan) {
      setSpan(timespan);
      setSamples(defaultSamples || getMaxSamplesForSpan(timespan));
    }
  }, [defaultSamples, timespan]);

  const tick = () => {
    // Define this once for all queries so that they have exactly the same time range and X values
    const now = Date.now();

    if (threshold) {
      const data = getThresholdData(threshold, span, now);
      const newThresholdData = {};
      newThresholdData["data"] = data;
      newThresholdData["threshold"] = threshold;
      if (thresholdText) {
        newThresholdData["thresholdText"] = thresholdText;
      }
      setThresholdData(newThresholdData);
    }

    const allPromises = _.isFunction(fetchOptions)
      ? [fetchOptions()]
      : _.map(fetchOptions.queries, (query) =>
          _.isEmpty(query)
            ? Promise.resolve()
            : fetch(
                getPrometheusURL(fetchOptions.basePath, {
                  endpoint: PrometheusEndpoint.QUERY_RANGE,
                  endTime: now,
                  query,
                  samples,
                  timeout: "30s",
                  timespan: span,
                }),
                fetchOptions.options
              ).then((response) => response.json())
        );

    return Promise.all(allPromises)
      .then((responses: PrometheusResponse[]) => {
        const newResults: PrometheusResult[][] = _.map(
          responses,
          "data.result"
        );
        const newGraphData = _.map<PrometheusResult[], Series[]>(
          newResults,
          (result: PrometheusResult[]) => {
            return _.map(result, ({ metric, values }): Series => {
              return [metric, formatSeriesValues(values ?? [], samples, span)];
            });
          }
        );
        setGraphData(newGraphData);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.log(err);
        }
      });
  };

  let delay;
  if (pollInterval && pollInterval > 0) {
    delay = pollInterval;
  } else {
    delay = Math.max(span / 120, minPollInterval);
  }

  const queriesKey = _.isFunction(fetchOptions)
    ? undefined
    : _.reject(fetchOptions.queries, _.isEmpty).join();

  usePoll(tick, delay, queriesKey, samples, span);

  return (
    <div ref={containerRef}>
      {width > 0 && (
        <PrometheusChartGraph
          allSeries={graphData}
          isStack={graphType === GraphTypes.area}
          formatSeriesTitle={formatSeriesTitle}
          showLegend={showLegend}
          span={span}
          width={width}
          thresholdData={thresholdData}
        />
      )}
    </div>
  );
};

const PrometheusChartGraph: React.FunctionComponent<PrometheusChartGraphProps> =
  ({
    allSeries,
    isStack,
    span,
    formatSeriesTitle,
    width,
    showLegend,
    thresholdData,
  }) => {
    const [xDomain, setXDomain] = React.useState(getXDomain(Date.now(), span));
    const data: GraphSeries[] = [];
    const tooltipSeriesNames: string[] = [];
    const legendData: LegendData[] = [];

    React.useEffect(() => {
      setXDomain(getXDomain(Date.now(), span));
    }, [allSeries, span]);

    _.each(allSeries, (series, i) => {
      _.each(series, ([metric, values]) => {
        data.push(values);
        let name: string;
        if (!_.isUndefined(metric) && formatSeriesTitle) {
          name = formatSeriesTitle(metric, i);
        } else {
          name = formatLabels(metric);
        }
        legendData.push({ name });
        tooltipSeriesNames.push(name);
      });
    });

    if (!_.isEmpty(thresholdData)) {
      legendData.push({
        name: thresholdData?.thresholdText ?? "Limit",
        symbol: {
          fill: chart_color_black_500.value,
          type: "threshold",
        },
      });
    }

    const domain = { x: xDomain, y: undefined };

    const graphContainer = (
      <ChartVoronoiContainer
        activateData={false}
        labels={() => " "}
        labelComponent={
          <Tooltip
            threshold={thresholdData?.threshold}
            thresholdText={thresholdData?.thresholdText}
          />
        }
        mouseFollowTooltips
        voronoiDimension="x"
        voronoiPadding={0}
      />
    );

    const xAxisTickFormat = (d: number | Date) => {
      return timeFormatter.format(d);
    };

    const GroupComponent = isStack ? ChartStack : ChartGroup;
    const ChartComponent = isStack ? ChartArea : ChartLine;

    return (
      <Chart
        ariaTitle={`Prometheus Chart`}
        containerComponent={graphContainer}
        domain={domain}
        domainPadding={{ y: 1 }}
        legendPosition="bottom-left"
        legendComponent={
          showLegend ? (
            <ChartLegend
              data={legendData}
              itemsPerRow={4}
              orientation="vertical"
              style={{
                labels: { fontSize: 12 },
              }}
              symbolSpacer={6}
            />
          ) : undefined
        }
        padding={{
          bottom: 110, // Adjusted to accomodate legend
          left: 90,
          right: 60,
          top: 25,
        }}
        height={350}
        theme={theme}
        scale={{ x: "time", y: "linear" }}
        width={width}
      >
        <ChartAxis tickCount={6} tickFormat={xAxisTickFormat} fixLabelOverlap />
        <ChartAxis
          crossAxis={false}
          dependentAxis
          tickCount={6}
          tickFormat={formatValue}
        />
        <GroupComponent>
          {data.map((values, i) => {
            if (values === null || !colors) {
              return null;
            }
            const color = colors[i % colors.length];
            const style = {
              data: { [isStack ? "fill" : "stroke"]: color },
              labels: { fill: color, name: tooltipSeriesNames[i] },
            };
            return (
              <ChartComponent
                data={values}
                key={i}
                name={`series-${i}`}
                style={style}
              />
            );
          })}
        </GroupComponent>
        {!_.isEmpty(thresholdData?.data) && (
          <ChartThreshold
            key="chart-threshold"
            data={thresholdData?.data}
            style={{
              data: {
                stroke: chart_color_black_500.value,
              },
            }}
          />
        )}
      </Chart>
    );
  };
