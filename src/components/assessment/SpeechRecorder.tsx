import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export interface SpeechTask {
  id: string;
  title: string;
  description: string;
  prompt: string;
  maxDurationMs?: number;
  visualUrl?: string;
  storyScript?: string;
  fluencyType?: "category" | "letter";
  fluencyTarget?: string;
  hideScriptDuringRecall?: boolean;
  unlockAfterTaskId?: string;
  unlockDelayMs?: number;
}

interface SpeechRecorderProps {
  language: string;
  tasks: SpeechTask[];
  isUploading?: boolean;
  onUpload: (payload: {
    taskId: string;
    blob: Blob;
    durationMs: number;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  onComplete: () => void;
}

const LOCK_POLL_INTERVAL = 500;

const VOICE_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

export const SpeechRecorder = ({
  language,
  tasks,
  isUploading,
  onUpload,
  onComplete,
}: SpeechRecorderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lockRemainingMs, setLockRemainingMs] = useState<number | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>();
  const startTimestampRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const autoStopTriggeredRef = useRef(false);
  const taskVisibleAtRef = useRef<Record<string, number>>({});
  const prepDurationRef = useRef<Record<string, number>>({});
  const statsRef = useRef<Record<string, { starts: number; autoStops: number }>>({});
  const storyPlaybackRef = useRef<Record<string, number>>({});
  const storyStartedRef = useRef<Record<string, boolean>>({});

  const [availableAtMap, setAvailableAtMap] = useState<Record<string, number>>(() => {
    const now = Date.now();
    return tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.id] = task.unlockAfterTaskId ? Number.POSITIVE_INFINITY : now;
      return acc;
    }, {});
  });

  const dependencyMap = useMemo(() => {
    return tasks.reduce<Record<string, SpeechTask[]>>((acc, task) => {
      if (!task.unlockAfterTaskId) return acc;
      if (!acc[task.unlockAfterTaskId]) acc[task.unlockAfterTaskId] = [];
      acc[task.unlockAfterTaskId].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const currentTask = useMemo(() => tasks[currentIndex], [tasks, currentIndex]);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    startTimestampRef.current = null;
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  }, []);

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (!event.data.size) return;
    chunksRef.current.push(event.data);
  }, []);

  const stopNarration = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
  }, []);

  const playNarration = useCallback(() => {
    if (!currentTask?.storyScript) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast({
        title: "Narration unavailable",
        description: "Your browser does not support speech synthesis. Please read the story text manually.",
      });
      return;
    }
    stopNarration();
    const utterance = new SpeechSynthesisUtterance(currentTask.storyScript);
    const locale = VOICE_LOCALE_MAP[language] ?? "en-US";
    utterance.lang = locale;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsNarrating(true);
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);
    storyPlaybackRef.current[currentTask.id] = (storyPlaybackRef.current[currentTask.id] ?? 0) + 1;
    window.speechSynthesis.speak(utterance);
  }, [currentTask, language, stopNarration]);

  useEffect(() => {
    const now = Date.now();
    setAvailableAtMap((prev) => {
      const next = { ...prev };
      tasks.forEach((task) => {
        if (next[task.id] === undefined) {
          next[task.id] = task.unlockAfterTaskId ? Number.POSITIVE_INFINITY : now;
        }
      });
      return next;
    });
  }, [tasks]);

  useEffect(() => {
    if (!currentTask) return;
    taskVisibleAtRef.current[currentTask.id] = Date.now();
    autoStopTriggeredRef.current = false;
    storyStartedRef.current[currentTask.id] = storyStartedRef.current[currentTask.id] ?? false;
    setIsNarrating(false);
  }, [currentTask]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopNarration();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current?.stop();
    };
  }, [stopNarration, stopTimer]);

  useEffect(() => {
    if (!currentTask) {
      setLockRemainingMs(null);
      return;
    }

    if (!currentTask.unlockAfterTaskId) {
      setLockRemainingMs(null);
      return;
    }

    const updateLock = () => {
      const unlockAt = availableAtMap[currentTask.id] ?? Date.now();
      const remaining = unlockAt - Date.now();
      setLockRemainingMs(remaining > 0 ? remaining : 0);
    };

    updateLock();
    const interval = window.setInterval(updateLock, LOCK_POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [currentTask, availableAtMap]);

  const unlockDependents = useCallback(
    (taskId: string) => {
      const dependents = dependencyMap[taskId];
      if (!dependents?.length) return;
      const now = Date.now();
      setAvailableAtMap((prev) => {
        const next = { ...prev };
        dependents.forEach((task) => {
          const unlockAt = now + (task.unlockDelayMs ?? 0);
          next[task.id] = unlockAt;
        });
        return next;
      });
    },
    [dependencyMap],
  );

  const isLocked = useMemo(() => {
    if (!currentTask) return false;
    if (lockRemainingMs === null) return false;
    return lockRemainingMs > 0;
  }, [currentTask, lockRemainingMs]);

  const startRecording = async () => {
    if (!currentTask) return;
    if (isLocked) {
      toast({
        title: "Hold on",
        description: "This recall task unlocks after the scheduled delay. Please wait for the countdown.",
      });
      return;
    }
    try {
      stopNarration();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || candidates[0];

      const recorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setIsRecording(true);
      setElapsedMs(0);
      startTimestampRef.current = performance.now();
      autoStopTriggeredRef.current = false;
      storyStartedRef.current[currentTask.id] = true;

      const visibleAt = taskVisibleAtRef.current[currentTask.id] ?? Date.now();
      prepDurationRef.current[currentTask.id] = Date.now() - visibleAt;
      statsRef.current[currentTask.id] = {
        starts: (statsRef.current[currentTask.id]?.starts ?? 0) + 1,
        autoStops: statsRef.current[currentTask.id]?.autoStops ?? 0,
      };

      const tick = () => {
        if (startTimestampRef.current) {
          const now = performance.now();
          setElapsedMs(now - startTimestampRef.current);
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      recorder.addEventListener("dataavailable", handleDataAvailable);
      recorder.addEventListener("stop", async () => {
        const stopNow = performance.now();
        const durationMs =
          startTimestampRef.current != null ? stopNow - startTimestampRef.current : elapsedMs;

        recorder.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        stopTimer();

        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current[0]?.type || "audio/webm",
        });

        const stats = statsRef.current[currentTask.id] ?? { starts: 1, autoStops: 0 };
        const metadata: Record<string, unknown> = {
          restarts: stats.starts,
          autoStopCount: stats.autoStops,
          autoStopTriggered: autoStopTriggeredRef.current,
          prepTimeMs: prepDurationRef.current[currentTask.id] ?? null,
          fluencyType: currentTask.fluencyType ?? null,
          fluencyTarget: currentTask.fluencyTarget ?? null,
          storyLength: currentTask.storyScript?.length ?? null,
          storyPlaybackCount: storyPlaybackRef.current[currentTask.id] ?? 0,
          language,
        };

        try {
          let lastError: unknown;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await onUpload({ taskId: currentTask.id, blob, durationMs, metadata });
              lastError = undefined;
              break;
            } catch (error) {
              lastError = error;
              await new Promise((resolve) => setTimeout(resolve, 600));
            }
          }
          if (lastError) throw lastError;

          chunksRef.current = [];
          unlockDependents(currentTask.id);

          if (currentIndex < tasks.length - 1) {
            setCurrentIndex((index) => index + 1);
            setElapsedMs(0);
          } else {
            onComplete();
          }
        } catch (error) {
          console.error(error);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Could not upload speech sample.",
          });
        }
      });

      recorder.start();

      if (currentTask.maxDurationMs) {
        autoStopTimeoutRef.current = window.setTimeout(() => {
          if (recorder.state === "recording") {
            autoStopTriggeredRef.current = true;
            statsRef.current[currentTask.id] = {
              starts: statsRef.current[currentTask.id]?.starts ?? 1,
              autoStops: (statsRef.current[currentTask.id]?.autoStops ?? 0) + 1,
            };
            try {
              (recorder as any).requestData?.();
            } catch {}
            recorder.stop();
          }
        }, currentTask.maxDurationMs);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Microphone access denied",
        description: "Please enable microphone permissions to record speech.",
      });
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        (recorder as any).requestData?.();
      } catch {}
      recorder.stop();
    }
  };

  const progress = currentTask?.maxDurationMs
    ? Math.min(100, Math.round((elapsedMs / currentTask.maxDurationMs) * 100))
    : undefined;

  if (!currentTask) {
    return null;
  }

  const showStoryScript = currentTask.storyScript && !(currentTask.hideScriptDuringRecall && (isRecording || storyStartedRef.current?.[currentTask.id]));
  const countdownText = lockRemainingMs !== null ? formatCountdown(lockRemainingMs) : "Complete the prerequisite task to unlock.";
  const canNarrate = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{currentTask.title}</CardTitle>
            <CardDescription>{currentTask.description}</CardDescription>
          </div>
          <Badge>{language.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentTask.visualUrl && (
          <div className="overflow-hidden rounded-xl border bg-muted/40">
            <img src={currentTask.visualUrl} alt="Speech prompt visual" className="h-64 w-full object-cover" />
          </div>
        )}

        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Prompt:</span> {currentTask.prompt}
          </p>
          {currentTask.fluencyType && currentTask.fluencyTarget && (
            <p className="text-xs uppercase tracking-widest text-primary">Focus: rapid {currentTask.fluencyType} fluency · "{currentTask.fluencyTarget}"</p>
          )}
          {showStoryScript && currentTask.storyScript && (
            <blockquote className="rounded-lg border-l-2 border-primary/60 bg-background p-4 text-sm text-muted-foreground">
              {currentTask.storyScript}
            </blockquote>
          )}
          {isLocked && (
            <div className="rounded-md border border-amber-500/50 bg-amber-100/40 p-3 text-amber-700 text-sm">
              Delayed recall unlocks in <strong>{countdownText}</strong>
            </div>
          )}
        </div>

        <div className="space-y-3 text-center">
          <div className="text-3xl font-mono font-semibold">{(elapsedMs / 1000).toFixed(1)}s</div>
          {progress !== undefined && <Progress value={progress} />}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            type="button"
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading || isLocked}
            className={isRecording ? "bg-destructive text-destructive-foreground" : undefined}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
          {currentTask.storyScript && !isRecording && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={isNarrating ? stopNarration : playNarration}
              disabled={!canNarrate}
            >
              {isNarrating ? "Stop Story" : "Play Story"}
            </Button>
          )}
          {!isRecording && !isLocked && (
            <p className="text-xs text-muted-foreground">
              Prep time is being tracked automatically. Begin when you're ready.
            </p>
          )}
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Task {currentIndex + 1} of {tasks.length}
        </div>
      </CardContent>
    </Card>
  );
};
