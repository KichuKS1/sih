import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentResult } from "@/services/api";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface RiskResultCardProps {
  result: AssessmentResult;
  languageLabel?: string;
}

const RISK_COLOR_MAP: Record<AssessmentResult["riskLevel"], string> = {
  Low: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-red-100 text-red-800 border-red-200",
};

export const RiskResultCard = ({ result, languageLabel }: RiskResultCardProps) => {
  const formatFeatureName = (key: string) =>
    key
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const riskClassName = RISK_COLOR_MAP[result.riskLevel];
  const confidence = Math.round(result.probability * 100);

  const donutColor = useMemo(() => {
    if (result.riskLevel === "High") return "#dc2626"; // red-600
    if (result.riskLevel === "Medium") return "#ca8a04"; // yellow-600
    return "#16a34a"; // green-600
  }, [result.riskLevel]);

  // Session-level heuristics for max attainable scores (prevents division by zero)
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

  const normalized = {
    memory: Math.min(100, (result.subScores.memoryScore / domainMax.memoryScore) * 100),
    attention: Math.min(100, (result.subScores.attentionScore / domainMax.attentionScore) * 100),
    language: Math.min(100, (result.subScores.languageScore / domainMax.languageScore) * 100),
    executive: Math.min(100, (result.subScores.executiveScore / domainMax.executiveScore) * 100),
  };

  const dementiaPct = {
    memory: Math.min(100, (dementiaBenchmark.memoryScore / domainMax.memoryScore) * 100),
    attention: Math.min(100, (dementiaBenchmark.attentionScore / domainMax.attentionScore) * 100),
    language: Math.min(100, (dementiaBenchmark.languageScore / domainMax.languageScore) * 100),
    executive: Math.min(100, (dementiaBenchmark.executiveScore / domainMax.executiveScore) * 100),
  };

  // printing removed from card; top-level print action can be added elsewhere if needed

  return (
    <Card id="risk-report" className="shadow-card">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between gap-4">
          <span>Cognitive Health Summary</span>
          {languageLabel ? <Badge>{languageLabel}</Badge> : null}
        </CardTitle>
        <CardDescription>
          Generated on {new Date().toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Probability donut + summary */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-center">
            <div
              aria-label="Risk probability"
              className="relative h-36 w-36 rounded-full"
              style={{ background: `conic-gradient(${donutColor} ${confidence * 3.6}deg, #e5e7eb 0deg)` }}
            >
              <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{confidence}%</div>
                  <div className="text-xs text-muted-foreground">Risk Probability</div>
                </div>
              </div>
            </div>
          </div>
          <div className={cn("rounded-lg border px-4 py-3", riskClassName)}>
            <p className="text-lg font-semibold">Risk Level: {result.riskLevel}</p>
            <p className="text-sm opacity-90">Confidence: {confidence}%</p>
            <p className="mt-2 text-xs opacity-90">
              This screening is not a diagnosis. Please consult a clinician for comprehensive evaluation.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Key Contributors
          </h3>
          <div className="space-y-3">
            {result.featureImportances.map((feature) => (
              <div key={feature.feature} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{formatFeatureName(feature.feature)}</span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      feature.direction === "positive" ? "text-red-600" : "text-green-600",
                    )}
                  >
                    {feature.direction === "positive" ? "↑" : "↓"} {Math.round(feature.contribution * 100)}%
                  </span>
                </div>
                <Progress value={Math.abs(feature.contribution) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Comparative sub-scores */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cognitive Sub-Scores</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium text-muted-foreground">Memory</p>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs"><span>Normal</span><span>100%</span></div>
                <Progress value={100} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Patient</span><span>{Math.round(normalized.memory)}%</span></div>
                <Progress value={normalized.memory} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Dementia</span><span>{Math.round(dementiaPct.memory)}%</span></div>
                <Progress value={dementiaPct.memory} className="h-1.5" />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium text-muted-foreground">Attention</p>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs"><span>Normal</span><span>100%</span></div>
                <Progress value={100} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Patient</span><span>{Math.round(normalized.attention)}%</span></div>
                <Progress value={normalized.attention} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Dementia</span><span>{Math.round(dementiaPct.attention)}%</span></div>
                <Progress value={dementiaPct.attention} className="h-1.5" />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium text-muted-foreground">Language</p>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs"><span>Normal</span><span>100%</span></div>
                <Progress value={100} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Patient</span><span>{Math.round(normalized.language)}%</span></div>
                <Progress value={normalized.language} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Dementia</span><span>{Math.round(dementiaPct.language)}%</span></div>
                <Progress value={dementiaPct.language} className="h-1.5" />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium text-muted-foreground">Executive</p>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs"><span>Normal</span><span>100%</span></div>
                <Progress value={100} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Patient</span><span>{Math.round(normalized.executive)}%</span></div>
                <Progress value={normalized.executive} className="h-1.5" />
                <div className="flex items-center justify-between text-xs"><span>Dementia</span><span>{Math.round(dementiaPct.executive)}%</span></div>
                <Progress value={dementiaPct.executive} className="h-1.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendations
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </div>

        {/* Removed in-card Download PDF button */}
      </CardContent>
    </Card>
  );
};
