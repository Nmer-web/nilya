"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityDay = {
  /** Short weekday label, e.g. "Mon". */
  day: string;
  /** ISO date this bar covers, for the tooltip. */
  date: string;
  count: number;
  today: boolean;
};

const GREEN = "#0F6E56";
const REST = "var(--border)";

/**
 * Listings created per day over the last seven days. Every number is a count
 * of real rows; the label over the tallest bar is that day's share of the
 * week's listings (constitution Principle II).
 */
export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(0, ...days.map((day) => day.count));
  const tallest = max > 0 ? days.findIndex((day) => day.count === max) : -1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={days}
          margin={{ top: 28, right: 8, bottom: 0, left: 8 }}
          barCategoryGap="28%"
        >
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={8}
          />
          <YAxis hide domain={[0, max > 0 ? "auto" : 4]} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: 12,
              padding: "6px 10px",
            }}
            labelFormatter={(_, payload) => {
              const first = payload?.[0]?.payload as ActivityDay | undefined;
              return first ? first.date : "";
            }}
            formatter={(value) => [
              `${value} listing${value === 1 ? "" : "s"}`,
              "Created",
            ]}
          />
          <Bar dataKey="count" radius={[6, 6, 6, 6]} maxBarSize={44} isAnimationActive={false}>
            {days.map((day) => (
              <Cell key={day.date} fill={day.today ? GREEN : REST} />
            ))}
            <LabelList
              dataKey="count"
              content={(props) => {
                const { x, y, width, index } = props;
                if (index !== tallest || total === 0) return null;
                const cx = Number(x) + Number(width) / 2;
                const share = Math.round((max / total) * 100);
                return (
                  <g>
                    <rect
                      x={cx - 22}
                      y={Number(y) - 26}
                      width={44}
                      height={20}
                      rx={10}
                      fill={GREEN}
                    />
                    <text
                      x={cx}
                      y={Number(y) - 12}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {share}%
                    </text>
                  </g>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
