"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";

export function ProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const data = [{ name: label, value }];
  return (
    <div className="flex flex-col items-center gap-2">
      <RadialBarChart
        width={90}
        height={90}
        cx="50%"
        cy="50%"
        innerRadius={32}
        outerRadius={44}
        barSize={8}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar
          background
          dataKey="value"
          cornerRadius={6}
          fill="#9b6cff"
        />
      </RadialBarChart>
      <div className="text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)]">
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}%</div>
    </div>
  );
}

