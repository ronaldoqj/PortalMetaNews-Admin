"use client";

import { AreaChart, BarChart } from "@mantine/charts";
import { useFormatter } from "next-intl";
import { useCallback, useMemo } from "react";

export interface TrendSeries {
  /** Key of the value in each point; letters, digits, `-` and `_` only. */
  key: string;
  label: string;
  /** Mantine colour or CSS colour, such as `var(--dashboard-series-1)`. */
  color: string;
}

export interface DailyPoint {
  /** Calendar day as `YYYY-MM-DD`, oldest first. */
  day: string;
  values: Record<string, number>;
}

/** Days as one short label each ("13 nov."), read as calendar days whatever the browser's time zone. */
function useDayLabel() {
  const formatter = useFormatter();
  return useCallback((day: string) => {
    const [year, month, date] = day.split("-").map(Number);
    return formatter.dateTime(new Date(Date.UTC(year, month - 1, date)), { day: "numeric", month: "short", timeZone: "UTC" });
  }, [formatter]);
}

const PLOT_MARGIN = { top: 8, right: 20, bottom: 0, left: 8 };

/**
 * A daily series as an area (`area`, for a continuous measure such as reads) or bars (`bar`, for counts such as
 * articles published); a single y-axis, scrolling sideways on phones.
 */
export function DailyTrendChart({ points, series, type = "area", height = 240, label }: {
  points: readonly DailyPoint[]; series: readonly TrendSeries[]; type?: "area" | "bar"; height?: number; label: string;
}) {
  const formatter = useFormatter();
  const dayLabel = useDayLabel();
  const data = useMemo(() => points.map((point) => ({ day: dayLabel(point.day), ...point.values })), [points, dayLabel]);
  const chartSeries = series.map(({ key, label: name, color }) => ({ name: key, label: name, color }));
  const shared = {
    h: height, data, dataKey: "day", series: chartSeries, gridAxis: "y" as const, strokeDasharray: "4 4", tickLine: "none" as const,
    withLegend: series.length > 1, legendProps: { verticalAlign: "top" as const }, valueFormatter: (value: number) => formatter.number(value),
    tooltipAnimationDuration: 150, xAxisProps: { interval: "preserveStartEnd" as const, minTickGap: 24 },
  };
  return <div className="dashboard-chart-scroll" role="figure" aria-label={label}>
    {type === "bar"
      ? <BarChart {...shared} barChartProps={{ margin: PLOT_MARGIN }} />
      : <AreaChart {...shared} curveType="monotone" areaChartProps={{ margin: PLOT_MARGIN }} withGradient fillOpacity={0.25} dotProps={{ r: 0 }} activeDotProps={{ r: 5, strokeWidth: 2 }} strokeWidth={2} />}
  </div>;
}
