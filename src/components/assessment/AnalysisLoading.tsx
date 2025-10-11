import { useMemo } from "react";
import { ShieldCheck, AudioWaveform, BrainCircuit, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PHASES = [
  {
    threshold: 20,
    title: "Securing your data",
    description: "Encrypting speech and cognitive logs before running local checks.",
    icon: ShieldCheck,
  },
  {
    threshold: 55,
    title: "Analyzing speech patterns",
    description: "Measuring clarity, pace, and coverage from your recordings.",
    icon: AudioWaveform,
  },
  {
    threshold: 80,
    title: "Scoring cognitive tasks",
    description: "Comparing recall and attention scores against healthy baselines.",
    icon: BrainCircuit,
  },
  {
    threshold: 100,
    title: "Generating insights",
    description: "Combining all signals to build your personalized risk report.",
    icon: Sparkles,
  },
] as const;

interface AnalysisLoadingProps {
  progress: number;
  className?: string;
}

export const AnalysisLoading = ({ progress, className }: AnalysisLoadingProps) => {
  const phase = useMemo(() => {
    return PHASES.find((item) => progress <= item.threshold) ?? PHASES[PHASES.length - 1];
  }, [progress]);

  const Icon = phase.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-slate-100 shadow-2xl",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_20%,rgba(129,140,248,0.3),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.3),transparent_45%),radial-gradient(circle_at_65%_75%,rgba(236,72,153,0.2),transparent_55%)] before:opacity-60 before:mix-blend-screen before:animate-[pulse_5s_ease-in-out_infinite]",
        "after:pointer-events-none after:absolute after:inset-[-60%] after:animate-spin after:bg-[conic-gradient(from_90deg,rgba(79,70,229,0.25)_0deg,transparent_140deg,rgba(14,165,233,0.35)_320deg)] after:opacity-30",
        "backdrop-blur-xl",
        className,
      )}
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-primary/30">
            <Icon className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Secure analysis in progress</p>
            <h3 className="text-2xl font-semibold text-white md:text-3xl">{phase.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{phase.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
            <span>Confidence synthesis</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 overflow-hidden rounded-full bg-white/10">
            <span className="sr-only">{Math.round(progress)}% complete</span>
          </Progress>
        </div>

        <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center backdrop-blur-md">
            <p className="text-2xl font-semibold text-white">24</p>
            <p className="text-xs uppercase tracking-widest text-slate-400">Acoustic markers</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center backdrop-blur-md">
            <p className="text-2xl font-semibold text-white">18</p>
            <p className="text-xs uppercase tracking-widest text-slate-400">Cognitive checks</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center backdrop-blur-md">
            <p className="text-2xl font-semibold text-white">AES-256</p>
            <p className="text-xs uppercase tracking-widest text-slate-400">Local encryption</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Nothing leaves this device unless you opt in to cloud sync.</p>
          <p className="font-medium text-primary/80">We'll notify you the moment your risk summary is ready.</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisLoading;
