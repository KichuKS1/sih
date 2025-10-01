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
}

interface SpeechRecorderProps {
  language: string;
  tasks: SpeechTask[];
  isUploading?: boolean;
  onUpload: (payload: {
    taskId: string;
    blob: Blob;
    durationMs: number;
  }) => Promise<void>;
  onComplete: () => void;
}

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>();
  const startTimestampRef = useRef<number | null>(null);

  const currentTask = useMemo(() => tasks[currentIndex], [tasks, currentIndex]);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    startTimestampRef.current = null;
  }, []);

  useEffect(() => () => {
    stopTimer();
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current?.stop();
  }, [stopTimer]);

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (!event.data.size) return;
    chunksRef.current.push(event.data);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // pick a supported mime type for best compatibility
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || candidates[0];

      const recorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setIsRecording(true);
      setElapsedMs(0);
      startTimestampRef.current = performance.now();

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
        // Compute duration before clearing timer value
        const stopNow = performance.now();
        const durationMs =
          startTimestampRef.current != null ? stopNow - startTimestampRef.current : elapsedMs;

        // Close tracks and stop timer
        recorder.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        stopTimer();

        // Build final blob from accumulated chunks and upload
        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current[0]?.type || "audio/webm",
        });

        try {
          let lastErr: unknown = undefined;
          for (let i = 0; i < 3; i++) {
            try {
              await onUpload({ taskId: currentTask.id, blob, durationMs });
              lastErr = undefined;
              break;
            } catch (e) {
              lastErr = e;
              await new Promise((r) => setTimeout(r, 600));
            }
          }
          if (lastErr) throw lastErr;
          chunksRef.current = [];

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
            description: "Could not upload speech sample. Please try again.",
          });
        }
      });

      // start without timeslice; we'll finalize and upload on stop
      recorder.start();

      if (currentTask.maxDurationMs) {
        setTimeout(() => {
          if (recorder.state === "recording") {
            try { (recorder as any).requestData?.(); } catch {}
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
      // Ask for the final data chunk before stopping
      try { (recorder as any).requestData?.(); } catch {}
      recorder.stop();
    }
  };

  const progress = currentTask?.maxDurationMs
    ? Math.min(100, Math.round((elapsedMs / currentTask.maxDurationMs) * 100))
    : undefined;

  if (!currentTask) {
    return null;
  }

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
        <div className="rounded-lg border p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Prompt:</span> {currentTask.prompt}
          </p>
        </div>

        <div className="space-y-3 text-center">
          <div className="text-3xl font-mono font-semibold">
            {(elapsedMs / 1000).toFixed(1)}s
          </div>
          {progress !== undefined && <Progress value={progress} />}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            type="button"
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
            className={isRecording ? "bg-destructive text-destructive-foreground" : undefined}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Task {currentIndex + 1} of {tasks.length}
        </div>
      </CardContent>
    </Card>
  );
};
