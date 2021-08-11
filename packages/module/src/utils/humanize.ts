import * as _ from "lodash-es";

type NumberSI = {
  string: string;
  value: number;
  unit?: string;
};

const getDefaultFractionDigits = (value: number) => {
  if (value < 1) {
    return 3;
  }
  if (value < 100) {
    return 2;
  }
  return 1;
};

const convertBaseValueToUnits = (
  value: number,
  unitArray: string[],
  divisor: number,
  initialUnit?: string
): { value: number; unit?: string } => {
  // duplicate the units
  const sliceIndex = initialUnit ? unitArray.indexOf(initialUnit) : 0;
  const units_ = unitArray.slice(sliceIndex);
  let unit = units_.shift();
  while (value >= divisor && units_.length > 0) {
    value = value / divisor;
    unit = units_.shift();
  }
  return { value, unit };
};

const round = (value: number): number => {
  if (!isFinite(value)) {
    return 0;
  }
  const multiplier = Math.pow(10, getDefaultFractionDigits(value));
  return Math.round(value * multiplier) / multiplier;
};

// eslint-disable-next-line
const formatValue = (value: number, options?: any) => {
  const fractionDigits = getDefaultFractionDigits(value);
  const { locales, ...rest } = _.defaults(options, {
    maximumFractionDigits: fractionDigits,
  });

  // 2nd check converts -0 to 0.
  if (!isFinite(value) || value === 0) {
    value = 0;
  }
  return Intl.NumberFormat(locales, rest).format(value);
};

// Format the number to SI, e.g. 1313546240 => 1.31G
export const humanizeNumberSI = (v: number): NumberSI => {
  const typeSI = {
    units: ["", "k", "M", "G", "T", "P", "E"],
    divisor: 1000,
  };
  if (!isFinite(v)) {
    v = 0;
  }

  let converted = convertBaseValueToUnits(v, typeSI.units, typeSI.divisor);
  converted.value = round(converted.value);
  converted = convertBaseValueToUnits(
    converted.value,
    typeSI.units,
    typeSI.divisor,
    converted.unit
  );
  const formattedValue = formatValue(converted.value);
  return {
    string: formattedValue + converted.unit,
    unit: converted.unit,
    value: converted.value,
  };
};
