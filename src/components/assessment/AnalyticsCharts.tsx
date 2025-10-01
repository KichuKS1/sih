import React, { useMemo, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentResult } from "@/services/api";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Radar, Line } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
);

interface AnalyticsChartsProps {
  result: AssessmentResult;
  history: AssessmentResult[];
}

export const AnalyticsCharts = forwardRef<HTMLDivElement, AnalyticsChartsProps>(function AnalyticsCharts(
  { result, history },
  ref,
) {
  const domainMax = {
    memoryScore: Math.max(1, 2),
    attentionScore: Math.max(1, 4),
    languageScore: Math.max(1, 1),
    executiveScore: Math.max(1, 1),
  } as const;

  const dementiaBenchmark = {
    memoryScore: 0.6,
    attentionScore: 1.2,
    languageScore: 0.4,
    executiveScore: 0.3,
  } as const;

  const radarData = useMemo(() => {
    const patient = [
      (result.subScores.memoryScore / domainMax.memoryScore) * 100,
      (result.subScores.attentionScore / domainMax.attentionScore) * 100,
      (result.subScores.languageScore / domainMax.languageScore) * 100,
      (result.subScores.executiveScore / domainMax.executiveScore) * 100,
    ];
    const dementia = [
      (dementiaBenchmark.memoryScore / domainMax.memoryScore) * 100,
      (dementiaBenchmark.attentionScore / domainMax.attentionScore) * 100,
      (dementiaBenchmark.languageScore / domainMax.languageScore) * 100,
      (dementiaBenchmark.executiveScore / domainMax.executiveScore) * 100,
    ];

    return {
      labels: ["Memory", "Attention", "Language", "Executive"],
      datasets: [
        {
          label: "Patient",
          data: patient,
          backgroundColor: "rgba(59,130,246,0.2)",
          borderColor: "rgba(59,130,246,1)",
          pointBackgroundColor: "rgba(59,130,246,1)",
        },
        {
          label: "Dementia Benchmark",
          data: dementia,
          backgroundColor: "rgba(220,38,38,0.15)",
          borderColor: "rgba(220,38,38,1)",
          pointBackgroundColor: "rgba(220,38,38,1)",
        },
        {
          label: "Normal",
          data: [100, 100, 100, 100],
          backgroundColor: "rgba(22,163,74,0.1)",
          borderColor: "rgba(22,163,74,1)",
          pointBackgroundColor: "rgba(22,163,74,1)",
        },
      ],
    };
  }, [result]);

  const trend = useMemo(() => {
    const trendHistory = history && history.length > 0 ? history : [result];
    const sorted = [...trendHistory].sort(
      (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );
    const labels = sorted.map((_, i) => `${i + 1}`);
    const prob = sorted.map((r) => Math.round(r.probability * 100));
    const memory = sorted.map((r) => r.subScores.memoryScore);
    const attention = sorted.map((r) => r.subScores.attentionScore);
    const language = sorted.map((r) => r.subScores.languageScore);
    const executive = sorted.map((r) => r.subScores.executiveScore);

    return {
      labels,
      datasets: [
        {
          label: "Risk %",
          data: prob,
          yAxisID: "y1",
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.15)",
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Memory",
          data: memory,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Attention",
          data: attention,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.15)",
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Language",
          data: language,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: "Executive",
          data: executive,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.15)",
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [history, result]);

  return (
    <div ref={ref} className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Per-Domain Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <Radar
            data={radarData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { display: false },
                },
              },
              plugins: { legend: { position: "bottom" as const } },
            }}
            height={280}
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Session Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Line
            data={trend}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, suggestedMax: 4 },
                y1: { beginAtZero: true, position: "right" as const, ticks: { callback: (v) => `${v}%` } },
              },
              plugins: { legend: { position: "bottom" as const } },
            }}
            height={280}
          />
        </CardContent>
      </Card>
    </div>
  );
});

export default AnalyticsCharts;
