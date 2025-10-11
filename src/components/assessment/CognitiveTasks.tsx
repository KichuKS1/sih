import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { InteractionLog, CognitiveScores } from "@/services/api";

export interface CognitiveTask {
  id: string;
  type: "word-recall" | "digit-span" | "tapping" | "clock-drawing" | "attention";
  title: string;
  description: string;
  prompt: string;
  options?: string[];
  correctAnswer?: number;
  durationMs?: number;
  // When provided, this task expects the user to tap options in this exact order (by index)
  sequenceAnswer?: number[];
}

export interface CognitiveCompletionPayload {
  logs: InteractionLog[];
  scores: CognitiveScores;
  clockDrawing?: string;
}

interface CognitiveTasksProps {
  tasks: CognitiveTask[];
  onComplete: (payload: CognitiveCompletionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

interface TaskState {
  startTime: number | null;
  responseTimeMs: number;
  correct: boolean | null;
  errors: number;
  selectedOption?: number;
  freeResponse?: string;
  // For sequence-based tasks (e.g., word-recall), record the chosen order of option indices
  sequence?: number[];
}

const createTaskState = (): TaskState => ({
  startTime: null,
  responseTimeMs: 0,
  correct: null,
  errors: 0,
});

export const CognitiveTasks = ({ tasks, onComplete, isSubmitting }: CognitiveTasksProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});
  const [isFinished, setIsFinished] = useState(false);
  const currentTask = useMemo(() => tasks[currentIndex], [tasks, currentIndex]);

  const startTaskTimer = (taskId: string) => {
    setTaskStates((prev) => {
      const existing = prev[taskId];
      if (existing?.startTime) {
        return prev;
      }
      return {
        ...prev,
        [taskId]: {
          ...(existing ?? createTaskState()),
          startTime: performance.now(),
        },
      };
    });
  };

  const getTaskState = (taskId: string): TaskState | undefined => taskStates[taskId];

  const hasRequiredResponse = (task: CognitiveTask): boolean => {
    const state = getTaskState(task.id);
    if (task.sequenceAnswer) {
      return (state?.sequence?.length ?? 0) === task.sequenceAnswer.length;
    }
    if (task.options && task.options.length > 0) {
      return typeof state?.selectedOption === "number";
    }
    if (task.type === "clock-drawing") {
      return Boolean(state?.freeResponse?.trim().length);
    }
    return true;
  };

  const canCompleteTask = (task: CognitiveTask): boolean => {
    if (isFinished) {
      return false;
    }
    if (task.type === "clock-drawing") {
      return hasRequiredResponse(task);
    }
    const state = getTaskState(task.id);
    if (!state?.startTime) {
      return false;
    }
    return hasRequiredResponse(task);
  };

  const completeTask = (taskId: string, overrides?: Partial<TaskState>) => {
    setTaskStates((prev) => {
      const currentState = prev[taskId] ?? createTaskState();
      const startedAt = currentState.startTime ?? performance.now();
      const responseTimeMs = overrides?.responseTimeMs ?? performance.now() - startedAt;

      return {
        ...prev,
        [taskId]: {
          ...currentState,
          ...overrides,
          startTime: null,
          responseTimeMs,
        },
      };
    });

    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((index) => Math.min(index + 1, tasks.length - 1));
    } else {
      setIsFinished(true);
    }
  };

  const handleOptionSelect = (task: CognitiveTask, optionIndex: number) => {
    const state = taskStates[task.id];
    if (!state?.startTime) {
      toast({ title: "Start the task first", description: "Press Begin before answering." });
      return;
    }

    if (task.sequenceAnswer && task.options) {
      setTaskStates((prev) => {
        const current = prev[task.id] ?? createTaskState();
        const sequence = current.sequence ?? [];
        if (sequence.includes(optionIndex) || sequence.length >= task.sequenceAnswer!.length) {
          return prev;
        }

        return {
          ...prev,
          [task.id]: {
            ...current,
            sequence: [...sequence, optionIndex],
          },
        };
      });
      return;
    }

    const isCorrect = task.correctAnswer !== undefined ? optionIndex === task.correctAnswer : null;
    setTaskStates((prev) => {
      const current = prev[task.id] ?? createTaskState();
      return {
        ...prev,
        [task.id]: {
          ...current,
          selectedOption: optionIndex,
          correct: isCorrect,
        },
      };
    });

    completeTask(task.id, { correct: isCorrect, selectedOption: optionIndex });
  };

  const handleFinish = async () => {
    try {
      const logs: InteractionLog[] = tasks.map((task) => {
        const state = taskStates[task.id] ?? createTaskState();
        const metadata =
          task.sequenceAnswer && task.options
            ? {
                expectedSequence: task.sequenceAnswer,
                selectedSequence: state.sequence ?? [],
              }
            : task.type === "clock-drawing"
              ? { description: state.freeResponse ?? "" }
              : undefined;

        return {
          taskId: task.id,
          taskType: "cognitive",
          prompt: task.prompt,
          responseTimeMs: Math.round(state.responseTimeMs ?? 0),
          correct: state.correct ?? null,
          errors: state.errors ?? 0,
          metadata,
        };
      });

      const scores = tasks.reduce<CognitiveScores>(
        (acc, task) => {
          const state = taskStates[task.id] ?? createTaskState();
          const baseScore = state.correct ? 1 : 0;
          const penalty = (state.errors ?? 0) * 0.1;
          const adjustedScore = Math.max(0, baseScore - penalty);

          if (task.type === "word-recall") acc.memoryScore += adjustedScore;
          if (task.type === "digit-span" || task.type === "attention") acc.attentionScore += adjustedScore;
          if (task.type === "tapping") acc.languageScore += adjustedScore;
          if (task.type === "clock-drawing") acc.executiveScore += adjustedScore;

          return acc;
        },
        {
          memoryScore: 0,
          attentionScore: 0,
          languageScore: 0,
          executiveScore: 0,
        },
      );

      const clockTask = tasks.find((task) => task.type === "clock-drawing");
      const clockDrawing = clockTask
        ? taskStates[clockTask.id]?.freeResponse?.trim() || undefined
        : undefined;

      await onComplete({
        logs,
        scores,
        clockDrawing,
      });

      toast({ title: "Cognitive tasks submitted" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Submission failed",
        description: "Could not submit cognitive responses. Please try again.",
      });
    }
  };

  const progress = Math.round(((currentIndex + (isFinished ? 1 : 0)) / tasks.length) * 100);

  if (!currentTask) {
    return null;
  }

  // Hide the prompt after Begin for recall-style tasks
  const showPrompt = !(
    (currentTask.type === "word-recall" || currentTask.type === "digit-span") &&
    !!taskStates[currentTask.id]?.startTime
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{currentTask.title}</CardTitle>
            <span className="text-sm text-muted-foreground">{currentTask.description}</span>
          </div>
          <Badge variant="secondary">
            Task {currentIndex + 1} / {tasks.length}
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        {showPrompt && (
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Prompt:</span> {currentTask.prompt}
            </p>
          </div>
        )}

        {/* Free-response for clock drawing */}
        {currentTask.type === "clock-drawing" && (
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Describe your imagined clock (required)</label>
            <textarea
              className="w-full rounded-md border bg-background p-3 text-sm"
              rows={4}
              placeholder="Numbers 1-12 placed evenly, hour hand near 11, minute hand at 2..."
              value={taskStates[currentTask.id]?.freeResponse ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setTaskStates((prev) => {
                  const current = prev[currentTask.id] ?? createTaskState();
                  return {
                    ...prev,
                    [currentTask.id]: {
                      ...current,
                      startTime: current.startTime ?? performance.now(),
                      freeResponse: value,
                    },
                  };
                });
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {currentTask.type !== "clock-drawing" && (
            <Button
              size="sm"
              variant="outline"
              disabled={!!taskStates[currentTask.id]?.startTime}
              onClick={() => startTaskTimer(currentTask.id)}
            >
              Begin
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={!canCompleteTask(currentTask)}
            onClick={() => {
              if (currentTask.sequenceAnswer) {
                const state = taskStates[currentTask.id];
                const seq = state?.sequence ?? [];
                const expected = currentTask.sequenceAnswer;
                if (seq.length !== expected.length) {
                  toast({
                    title: "Finish the sequence",
                    description: "Select all items in the correct order before completing.",
                  });
                  return;
                }
                const len = Math.max(expected.length, seq.length);
                let mismatches = 0;
                for (let i = 0; i < len; i++) {
                  if (expected[i] !== seq[i]) mismatches++;
                }
                const isCorrect = mismatches === 0;
                completeTask(currentTask.id, { correct: isCorrect, errors: mismatches });
                return;
              }

              if (currentTask.type === "clock-drawing") {
                const state = taskStates[currentTask.id];
                const description = state?.freeResponse?.trim();
                if (!description) {
                  toast({
                    title: "Describe your drawing",
                    description: "Add a brief description of your imagined clock before continuing.",
                  });
                  return;
                }
                if (!state?.startTime) {
                  startTaskTimer(currentTask.id);
                }
                completeTask(currentTask.id, { correct: true, errors: 0 });
                return;
              }

              const markCorrect = currentTask.type === "clock-drawing" ? { correct: true } : undefined;
              completeTask(currentTask.id, markCorrect);
            }}
          >
            Complete
          </Button>
        </div>

        {/* Selected sequence visualizer */}
        {currentTask.sequenceAnswer && taskStates[currentTask.id]?.sequence && (
          <div className="flex flex-wrap items-center gap-2">
            {(taskStates[currentTask.id]?.sequence ?? []).map((idx, i) => (
              <span key={`${idx}-${i}`} className="px-2 py-1 text-xs rounded-md border bg-muted/50">
                {i + 1}. {currentTask.options?.[idx]}
              </span>
            ))}
            {!!(taskStates[currentTask.id]?.sequence?.length) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setTaskStates((prev) => {
                    const cur = prev[currentTask.id];
                    if (!cur?.sequence?.length) return prev;
                    const next = [...cur.sequence];
                    next.pop();
                    return { ...prev, [currentTask.id]: { ...cur, sequence: next } };
                  })
                }
              >
                Undo
              </Button>
            )}
          </div>
        )}

        {currentTask.options && (
          <div className="grid gap-3">
            {currentTask.options.map((option, index) => (
              <Button
                key={option}
                variant={
                  // Highlight if chosen in sequence or selected in single-choice
                  currentTask.sequenceAnswer
                    ? (taskStates[currentTask.id]?.sequence ?? []).includes(index)
                      ? "default"
                      : "outline"
                    : taskStates[currentTask.id]?.selectedOption === index
                      ? "default"
                      : "outline"
                }
                className="justify-start"
                disabled={
                  !taskStates[currentTask.id]?.startTime ||
                  (currentTask.sequenceAnswer
                    ? (taskStates[currentTask.id]?.sequence ?? []).includes(index)
                    : false)
                }
                onClick={() => handleOptionSelect(currentTask, index)}
              >
                {option}
              </Button>
            ))}
          </div>
        )}

        {isFinished && (
          <Button size="lg" className="w-full" onClick={handleFinish} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Cognitive Data"}
          </Button>
        )}
      </CardContent>
    </Card>
  );

}
