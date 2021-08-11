import * as _ from "lodash-es";

// Range vector queries require end, start, and step search params
const getRangeVectorSearchParams = (
  endTime: number = Date.now(),
  samples = 30,
  timespan: number = 30 * 60 * 1000
): URLSearchParams => {
  const params = new URLSearchParams();
  params.append("start", `${(endTime - timespan) / 1000}`);
  params.append("end", `${endTime / 1000}`);
  params.append("step", `${timespan / samples / 1000}`);
  return params;
};

const getSearchParams = ({
  endpoint,
  endTime,
  timespan,
  samples,
  ...params
}: PrometheusURLProps): URLSearchParams => {
  const searchParams =
    endpoint === PrometheusEndpoint.QUERY_RANGE
      ? getRangeVectorSearchParams(endTime, samples, timespan)
      : new URLSearchParams();
  _.each(
    params,
    (value, key) => value && searchParams.append(key, value.toString())
  );
  return searchParams;
};

export const getPrometheusURL = (
  basePath: string,
  props: PrometheusURLProps
): string => {
  const params = getSearchParams(props);
  return `${basePath}/${props.endpoint}?${params.toString()}`;
};

export enum PrometheusEndpoint {
  LABEL = "api/v1/label",
  RULES = "api/v1/rules",
  QUERY = "api/v1/query",
  QUERY_RANGE = "api/v1/query_range",
}

type PrometheusURLProps = {
  endpoint: PrometheusEndpoint;
  endTime?: number;
  query?: string;
  samples?: number;
  timeout?: string;
  timespan?: number;
};
