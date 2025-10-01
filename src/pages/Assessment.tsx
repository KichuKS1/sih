import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserSession } from "@/context/UserSessionContext";
import {
  registerUser,
  startAssessment,
  uploadSpeechSample,
  submitCognitiveData,
  requestRiskPrediction,
  fetchAssessmentResult,
  AssessmentResult,
} from "@/services/api";
import { OnboardingForm, OnboardingFormValues } from "@/components/assessment/OnboardingForm";
import { SpeechRecorder, SpeechTask } from "@/components/assessment/SpeechRecorder";
import {
  CognitiveTasks,
  type CognitiveTask,
  type CognitiveCompletionPayload,
} from "@/components/assessment/CognitiveTasks";
import { RiskResultCard } from "@/components/assessment/RiskResultCard";
import AnalyticsCharts from "@/components/assessment/AnalyticsCharts";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShieldCheck, BrainCircuit, AudioWaveform, ClipboardList } from "lucide-react";
// Removed printing from Results page header
import { saveAssessmentResult, loadAssessmentHistory, saveEncryptedAssessmentResult, loadEncryptedAssessmentHistory } from "@/lib/history";
import { fingerprint } from "@/lib/crypto";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, logoutFirebase, saveReport, loadReports } from "@/lib/firebase";

// Temporary: enable local heuristic inference while backend model is unavailable
const USE_LOCAL_HEURISTIC = true;

const SPEECH_TASKS: SpeechTask[] = [
  {
    id: "picture-description",
    title: "Picture Description",
    description: "Describe the scene shown in the picture prompt in as much detail as possible.",
    prompt:
      "Imagine you are looking at a photo of a family cooking together in a kitchen. Describe everything you see.",
    maxDurationMs: 90_000,
  },
  {
    id: "story-recall",
    title: "Story Recall",
    description: "Listen to a short story and retell it in your own words.",
    prompt:
      "Recall a memorable event from your life and describe what happened, who was involved, and how it made you feel.",
    maxDurationMs: 120_000,
  },
  {
    id: "free-conversation",
    title: "Open Conversation",
    description: "Speak freely about any topic of your choice for at least one minute.",
    prompt: "Share your thoughts about how technology has changed communication in your lifetime.",
    maxDurationMs: 90_000,
  },
];

// Helpers to build randomized, non-repeating tasks per session
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeWordRecallTask(id: string, title: string, words: string[]): CognitiveTask {
  const options = shuffle(words);
  const sequenceAnswer = words.map((w) => options.indexOf(w));
  return {
    id,
    type: "word-recall",
    title,
    description: "Remember the list of words and tap them in the same order after Begin.",
    prompt: `Remember the words: ${words.join(", ")}.`,
    options,
    sequenceAnswer,
  };
}

function makeDigitSpanTask(id: string, title: string, digits: number[]): CognitiveTask {
  const pool = shuffle(Array.from(new Set([...digits, ...shuffle([0,1,2,3,4,5,6,7,8,9]).slice(0, 5)])));
  const options = pool.map(String);
  const sequenceAnswer = digits.map((d) => options.indexOf(String(d)));
  return {
    id,
    type: "digit-span",
    title,
    description: "Tap the digits in the exact order after Begin.",
    prompt: digits.join(", "),
    options,
    sequenceAnswer,
  };
}

const WORDS_BY_LANG: Record<string, string[]> = {
  en: ["Apple", "Train", "Moon", "Garden", "Candle", "Bridge", "Star", "Window", "River", "Mirror", "Bottle"],
  hi: ["सेब", "रेल", "चाँद", "बाग", "मोमबत्ती", "पुल", "तारा", "खिड़की", "नदी", "आईना", "बोतल"],
  bn: ["আপেল", "ট্রেন", "চাঁদ", "উদ্যান", "মোমবাতি", "সেতু", "তারকা", "জানালা", "নদী", "আয়না", "বোতল"],
  ta: ["ஆப்பிள்", "ரயில்", "நிலா", "தோட்டம்", " மெழுகுவர்த்தி", "பாலம்", "நட்சத்திரம்", "ஜன்னல்", "நதி", "கண்ணாடி", "பாட்டில்"],
};

function generateCognitiveTasks(language: string): CognitiveTask[] {
  const lex = WORDS_BY_LANG[language] ?? WORDS_BY_LANG.en;
  // Word pools (unique per session)
  const poolA = shuffle(lex).slice(0, 5);
  const poolB = shuffle(lex.filter((w) => !poolA.includes(w))).slice(0, 5);

  const word1 = makeWordRecallTask("word-recall", "Word Recall", poolA);
  const word2 = makeWordRecallTask("word-recall-2", "Word Recall II", poolB);

  const digit1 = makeDigitSpanTask("digit-span", "Digit Span", [3, 9, 1, 4, 7]);
  const digit2 = makeDigitSpanTask("digit-span-reverse", "Digit Span (Reverse)", [7, 2, 9, 3]);

  const attention1: CognitiveTask = {
    id: "attention-sequence",
    type: "attention",
    title: "Attention Pattern",
    description: "Continue the color sequence.",
    prompt: "Red → Blue → Red → Blue → ?",
    options: ["Red", "Blue", "Green"],
    correctAnswer: 0,
  };

  const visualSearch: CognitiveTask = {
    id: "attention-visual",
    type: "attention",
    title: "Visual Search",
    description: "Find the odd-one-out.",
    prompt: "Square, Square, Circle, Square → Which is different?",
    options: ["Circle", "Square", "Triangle"],
    correctAnswer: 0,
  };

  const clock: CognitiveTask = {
    id: "clock-drawing",
    type: "clock-drawing",
    title: "Clock Drawing",
    description: "Imagine drawing a clock showing the time 10 past 11.",
    prompt: "Picture a clock and describe how you would place the numbers and hands for 11:10.",
  };

  return [word1, digit1, attention1, word2, digit2, visualSearch, clock];
}

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  mr: "मराठी",
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
};

const STEP_CONFIG = [
  {
    id: "consent",
    title: "Onboarding & Consent",
    icon: ShieldCheck,
  },
  {
    id: "speech",
    title: "Speech Assessment",
    icon: AudioWaveform,
  },
  {
    id: "cognitive",
    title: "Cognitive Tasks",
    icon: ClipboardList,
  },
  {
    id: "results",
    title: "AI Risk Summary",
    icon: BrainCircuit,
  },
] as const;

const Assessment = () => {
  const { user, setUser, assessmentId, setAssessmentId, clearSession, auth, setAuth } = useUserSession();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeechUploading, setIsSpeechUploading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const cognitiveTasks = useMemo(() => generateCognitiveTasks(user?.language || "en"), [user?.language]);
  const [isResultPending, setIsResultPending] = useState(false);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const [speechDurations, setSpeechDurations] = useState<Record<string, number>>({});
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const activeStep = STEP_CONFIG[activeStepIndex];
  const isCloudSignedIn = auth?.provider === "firebase";

  useEffect(() => {
    setResult(null);
  }, [assessmentId]);

  useEffect(() => {
    (async () => {
      if (auth?.provider === "firebase") {
        const arr = await loadReports(auth.userId);
        setHistory(arr);
      } else if (auth?.provider === "local") {
        const arr = await loadEncryptedAssessmentHistory(auth.userId, auth.password || "");
        setHistory(arr);
      } else if (user) {
        setHistory(loadAssessmentHistory(user.id));
      } else {
        setHistory([]);
      }
    })();
  }, [auth, user]);

  const advanceStep = useCallback(() => {
    setActiveStepIndex((index) => Math.min(index + 1, STEP_CONFIG.length - 1));
  }, []);

  const resetAssessment = () => {
    clearSession();
    setActiveStepIndex(0);
    setResult(null);
    setIsResultPending(false);
  };

  // Local encrypted auth (anonymous ID derived from email) and printing
  const handleAuthLogin = async () => {
    if (!authEmail || !authPassword) {
      toast({ title: "Enter email and password" });
      return;
    }
    const anon = await fingerprint(authEmail.toLowerCase());
    setAuth({ userId: anon, email: authEmail, password: authPassword, provider: "local" });
    try {
      const arr = await loadEncryptedAssessmentHistory(anon, authPassword);
      setHistory(arr);
    } catch {}
    toast({ title: "Signed in", description: "Your reports will be stored encrypted under this login." });
  };

  const handleAuthSignup = handleAuthLogin; // same local flow

  const handleAuthLogout = () => {
    if (auth?.provider === "firebase") {
      logoutFirebase().catch(() => undefined);
    }
    setAuth(null);
    setHistory([]);
    setAuthEmail("");
    setAuthPassword("");
  };

  const handlePrint = () => {
    window.print();
  };

  const formatAuthError = (error: unknown) => {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message: string }).message)
        : typeof error === "string"
          ? error
          : "";
    if (message.includes("auth/email-already-in-use")) return "This email is already registered. Try logging in instead.";
    if (message.includes("auth/invalid-email")) return "That email address looks invalid.";
    if (message.includes("auth/wrong-password")) return "Incorrect password. Please try again.";
    if (message.includes("auth/user-not-found")) return "No account found with that email. Sign up first.";
    if (message.includes("network")) return "Network issue—check your connection and try again.";
    return "Something went wrong. Please try again.";
  };

  const requireCloudSignIn = () => {
    if (!isCloudSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please continue with Google first to unlock the assessment workflow.",
      });
      return true;
    }
    return false;
  };

  const handleOnboardingSubmit = async (values: OnboardingFormValues) => {
    if (requireCloudSignIn()) return;
    try {
      setIsLoading(true);
      const payload = {
        name: values.name,
        age: values.age,
        language: values.language,
        consent: values.consent,
      };
      const response = await registerUser(payload);
      setUser({
        id: response.user.id,
        name: response.user.name,
        age: response.user.age,
        language: response.user.language,
        consent: response.user.consent,
        accessToken: response.accessToken,
      });

      const assessment = await startAssessment(response.accessToken);
      setAssessmentId(assessment.assessmentId);
      toast({
        title: "Registration successful",
        description: "You can now begin your spoken assessment.",
      });
      advanceStep();
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not register",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechUpload = async ({ taskId, blob, durationMs }: { taskId: string; blob: Blob; durationMs: number }) => {
    if (requireCloudSignIn()) return;
    if (!assessmentId || !user) {
      toast({
        title: "Assessment not started",
        description: "Please complete onboarding first.",
      });
      return;
    }

    try {
      setIsSpeechUploading(true);
      await uploadSpeechSample({
        assessmentId,
        taskId,
        blob,
        language: user.language,
        accessToken: user.accessToken,
        // pass duration to backend for analytics
        durationMs,
      });

      toast({
        title: "Speech sample captured",
        description: `Recorded ${Math.round(durationMs / 1000)} seconds for ${taskId}.`,
      });
      // track duration locally for heuristic risk if backend is unavailable
      setSpeechDurations((prev) => ({ ...prev, [taskId]: durationMs }));
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      setIsSpeechUploading(false);
    }
  };

  const handleSpeechComplete = () => {
    toast({
      title: "Speech tasks done",
      description: "Continue with the cognitive exercises.",
    });
    advanceStep();
  };

  const handleCognitiveComplete = async ({ logs, scores, clockDrawing }: CognitiveCompletionPayload) => {
    if (!assessmentId || !user) {
      toast({
        title: "Assessment not started",
        description: "Please complete onboarding first.",
      });
      return;
    }

    try {
      setIsLoading(true);
      // Move to Results first for smoother UX
      advanceStep();
      setIsResultPending(true);

      // Always persist cognitive data to backend if available (non-blocking for heuristic mode)
      try {
        await submitCognitiveData(
          {
            assessmentId,
            logs,
            cognitiveScores: scores,
            clockDrawing,
          },
          user.accessToken,
        );
      } catch {}

      if (USE_LOCAL_HEURISTIC) {
        // Simple heuristic without ML: combine normalized cognitive scores and speech coverage
        const domainMax = { memoryScore: 2, attentionScore: 4, languageScore: 1, executiveScore: 1 } as const;
        const mem = Math.min(1, scores.memoryScore / domainMax.memoryScore);
        const att = Math.min(1, scores.attentionScore / domainMax.attentionScore);
        const lang = Math.min(1, scores.languageScore / domainMax.languageScore);
        const exec = Math.min(1, scores.executiveScore / domainMax.executiveScore);
        const cognitiveAvg = (mem + att + lang + exec) / 4;

        const expected = SPEECH_TASKS.map((t) => t.maxDurationMs ?? 60_000);
        const recorded = SPEECH_TASKS.map((t) => Math.min(speechDurations[t.id] ?? 0, t.maxDurationMs ?? 60_000));
        const coverage = recorded.length
          ? recorded.reduce((a, b, i) => a + (expected[i] ? b / expected[i] : 0), 0) / recorded.length
          : 0.5; // neutral if no speech

        // Risk is inverse of performance; clamp to [0.02, 0.98]
        let probability = 1 - (0.7 * cognitiveAvg + 0.3 * coverage);
        probability = Math.min(0.98, Math.max(0.02, probability));

        const riskLevel = probability > 0.66 ? "High" : probability > 0.33 ? "Medium" : "Low";
        const featureImportances: Array<{ feature: string; contribution: number; direction: "positive" | "negative" }> = [
          { feature: "memory_score", contribution: 0.5 - mem, direction: (mem < 0.5 ? "positive" : "negative") as "positive" | "negative" },
          { feature: "attention_score", contribution: 0.5 - att, direction: (att < 0.5 ? "positive" : "negative") as "positive" | "negative" },
          { feature: "language_score", contribution: 0.5 - lang, direction: (lang < 0.5 ? "positive" : "negative") as "positive" | "negative" },
          { feature: "executive_score", contribution: 0.5 - exec, direction: (exec < 0.5 ? "positive" : "negative") as "positive" | "negative" },
          { feature: "speech_coverage", contribution: 0.5 - Math.min(1, coverage), direction: (coverage < 0.5 ? "positive" : "negative") as "positive" | "negative" },
        ];

        const heuristic: AssessmentResult = {
          assessmentId,
          riskLevel,
          probability,
          featureImportances,
          subScores: scores,
          recommendations: [
            "Try a longer picture description (aim for ~60–90s).",
            "Practice digit span and word recall to boost attention and memory.",
            "Share this report with a clinician for guidance—this is not a diagnosis.",
          ],
          generatedAt: new Date().toISOString(),
        };

        setResult(heuristic);
        try {
          if (auth?.provider === "firebase") {
            await saveReport(auth.userId, heuristic);
            const arr = await loadReports(auth.userId);
            setHistory(arr);
          } else if (auth?.provider === "local") {
            await saveEncryptedAssessmentResult(auth.userId, heuristic, auth.password || "");
            const arr = await loadEncryptedAssessmentHistory(auth.userId, auth.password || "");
            setHistory(arr);
          } else if (user) {
            saveAssessmentResult(user.id, heuristic);
            setHistory(loadAssessmentHistory(user.id));
          }
        } catch {}
        setIsResultPending(false);
        return;
      }

      // Otherwise, call backend prediction and poll
      try {
        await requestRiskPrediction(assessmentId, user.accessToken);
      } catch {}

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let fetched: AssessmentResult | null = null;
      for (let i = 0; i < 15; i++) {
        try {
          fetched = await fetchAssessmentResult(assessmentId, user.accessToken);
          break;
        } catch (err) {
          await sleep(1000);
        }
      }
      if (fetched) {
        setResult(fetched);
        try {
          if (auth?.provider === "firebase") {
            await saveReport(auth.userId, fetched);
            const arr = await loadReports(auth.userId);
            setHistory(arr);
          } else if (auth?.provider === "local") {
            await saveEncryptedAssessmentResult(auth.userId, fetched, auth.password || "");
            const arr = await loadEncryptedAssessmentHistory(auth.userId, auth.password || "");
            setHistory(arr);
          } else if (user) {
            saveAssessmentResult(user.id, fetched);
            setHistory(loadAssessmentHistory(user.id));
          }
        } catch {}
      } else {
        toast({ title: "Prediction pending", description: "Result is taking longer than usual. Please wait a few seconds and retry." });
      }
      setIsResultPending(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Prediction failed", description: error instanceof Error ? error.message : "Please try again later." });
      setIsResultPending(false);
    } finally {
      setIsLoading(false);
    }
  };

  const languageLabel = useMemo(() => (user ? LANGUAGE_LABEL[user.language] ?? user.language : undefined), [user]);

  return (
    <div className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-4 text-center">
          <Badge variant="secondary">Clinical Screening Workflow</Badge>
          <h1 className="text-4xl font-bold text-foreground">Mindful Cognitive Screening</h1>
          <p className="text-muted-foreground">
            Complete a guided onboarding, record speech samples, finish cognitive tasks, and view an AI-powered
            dementia risk summary in your preferred language.
          </p>
        </header>

        {/* Account options */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Account</CardTitle>
          </CardHeader>
          <CardContent>
            {!auth ? (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium mb-2">Use secure cloud backup (optional)</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <Button onClick={async () => {
                      try {
                        const u = await signInWithGoogle();
                        setAuth({ provider: "firebase", userId: u.uid, email: u.email || "" });
                        const arr = await loadReports(u.uid);
                        setHistory(arr);
                        toast({ title: "Signed in with Google" });
                      } catch (e) {
                        toast({ title: "Google sign-in failed", description: formatAuthError(e) });
                      }
                    }}>Continue with Google</Button>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] items-end flex-1 min-w-[320px]">
                      <input type="email" placeholder="you@example.com" className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
                      <input type="password" placeholder="Password" className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
                      <Button variant="outline" onClick={async()=>{
                        try { const u = await signInWithEmail(authEmail, authPassword); setAuth({ provider: "firebase", userId: u.uid, email: u.email || "" }); const arr = await loadReports(u.uid); setHistory(arr); toast({ title: "Logged in" }); } catch(e){ toast({ title: "Login failed", description: formatAuthError(e) }); }
                      }}>Log in</Button>
                      <Button className="btn-hero" onClick={async()=>{
                        try { const u = await signUpWithEmail(authEmail, authPassword); setAuth({ provider: "firebase", userId: u.uid, email: u.email || "" }); setHistory([]); toast({ title: "Account created" }); } catch(e){ toast({ title: "Sign up failed", description: formatAuthError(e) }); }
                      }}>Sign up</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Storage: Encrypted cloud workspace linked to your email (assessment reports and derived scores only).</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Or use local-only encrypted storage (device)</p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
                    <div>
                      <label className="block text-xs mb-1 text-muted-foreground">Email (for anonymous ID)</label>
                      <input type="email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-muted-foreground">Local Password</label>
                      <input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" placeholder="••••••••" />
                    </div>
                    <Button variant="outline" onClick={handleAuthLogin}>Log in</Button>
                    <Button className="btn-hero" onClick={handleAuthSignup}>Sign up</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Storage: Encrypted in your browser (LocalStorage). Data stays on this device.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Signed in as <strong>{auth.email}</strong> ({auth.provider === "firebase" ? "Cloud backup" : "On-device encrypted"}) ID: {auth.userId}</div>
                <Button variant="outline" onClick={handleAuthLogout}>Sign out</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!isCloudSignedIn && (
          <Card className="border-yellow-500/60 bg-yellow-500/5">
            <CardContent className="py-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-yellow-700">Sign in with Google to continue</p>
                <p className="text-muted-foreground">
                  For security, the assessment workflow only unlocks after you connect your Google account using the button above. Once signed in, onboarding and recording steps will become available.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Assessment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              {STEP_CONFIG.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStepIndex;
                const isCompleted = index < activeStepIndex;
                return (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-4 text-center transition ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : isCompleted
                        ? "border-green-500/60 bg-green-500/10 text-green-600"
                        : "border-border bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">{step.title}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {activeStep.id === "consent" && isCloudSignedIn && (
          <div className="max-w-3xl mx-auto">
            <OnboardingForm user={user} onSubmit={handleOnboardingSubmit} isSubmitting={isLoading} />
          </div>
        )}

        {activeStep.id === "speech" && isCloudSignedIn && user && assessmentId && (
          <div className="space-y-6">
            <SpeechRecorder
              language={user.language}
              tasks={SPEECH_TASKS}
              isUploading={isSpeechUploading}
              onUpload={handleSpeechUpload}
              onComplete={handleSpeechComplete}
            />
          </div>
        )}

        {activeStep.id === "cognitive" && assessmentId && (
          <div className="space-y-6">
            <CognitiveTasks tasks={cognitiveTasks} onComplete={handleCognitiveComplete} isSubmitting={isLoading} />
          </div>
        )}

        {activeStep.id === "results" && (
          <div className="space-y-6">
            {isResultPending && (
              <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed p-10 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  Running multi-modal analysis. This typically takes 20-30 seconds.
                </p>
              </div>
            )}
            {result && (
              <>
                <div ref={reportRef} className="space-y-6">
                  <RiskResultCard result={result} languageLabel={languageLabel} />
                  <AnalyticsCharts result={result} history={history} />
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-4 justify-between">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Need clinical review? Share your anonymized assessment ID with healthcare professionals:
                  <strong> {assessmentId}</strong>
                </p>
                <p>All speech and cognitive data remain encrypted at rest and in transit.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint}>Download PDF</Button>
                <Button variant="outline" onClick={resetAssessment}>
                  Start New Assessment
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessment;
