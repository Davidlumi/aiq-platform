import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, BookOpen, Play,
  FileText, MessageSquare, Layers, Lightbulb, Target, Award, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Capability colour map
const CAP_COLOURS: Record<string, string> = {
  "ai-foundations":    "#4477AA",
  "ai-work-design":   "#AA3377",
  "ai-ethics":        "#228833",
  "ai-risk":          "#EE6677",
  "ai-strategy":      "#EE8866",
  "ai-data-literacy": "#66CCEE",
};

const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  article:           FileText,
  video:             Play,
  scenario_practice: Target,
  simulation:        Layers,
  quiz:              MessageSquare,
  case_study:        BookOpen,
  reflection:        Lightbulb,
  checklist:         CheckCircle2,
  infographic:       Award,
};

const DIFFICULTY_LABELS = ["", "Foundational", "Developing", "Proficient", "Advanced", "Expert"];

// ── Renderers ────────────────────────────────────────────────────────────────

function ArticleRenderer({ item }: { item: any }) {
  const body = item.bodyMarkdown || item.description || "No content available.";
  return (
    <div className="prose prose-slate max-w-none">
      <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function VideoRenderer({ item }: { item: any }) {
  const meta = typeof item.metadataJson === "object" ? item.metadataJson : {};
  const videoUrl = meta?.videoUrl || meta?.url;
  return (
    <div className="space-y-4">
      {videoUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe src={videoUrl} className="w-full h-full" allowFullScreen title={item.title} />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
          <div className="text-center space-y-2">
            <Play className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Video content — {item.estimatedMinutes ?? 10} min</p>
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </div>
  );
}

function ScenarioPracticeRenderer({ item }: { item: any }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const meta = typeof item.metadataJson === "object" ? item.metadataJson : {};
  const scenario = meta?.scenario || item.description || "Consider the following scenario and choose the best course of action.";
  const options = meta?.options || [
    { id: "a", label: "Escalate immediately to senior leadership", correct: false, feedback: "Escalation without investigation may not be the most effective first step." },
    { id: "b", label: "Investigate the situation and gather evidence before acting", correct: true, feedback: "Correct. Gathering evidence first ensures informed decision-making and proportionate response." },
    { id: "c", label: "Ignore the situation and monitor for further developments", correct: false, feedback: "Ignoring a potential issue creates risk and liability." },
    { id: "d", label: "Immediately involve external legal counsel", correct: false, feedback: "External counsel is appropriate after internal investigation, not as a first step." },
  ];
  return (
    <div className="space-y-6">
      <Card className="border-l-4" style={{ borderLeftColor: "#10B981" }}>
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Scenario</p>
          <p className="text-base text-foreground leading-relaxed">{scenario}</p>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">What is the most appropriate action?</p>
        {options.map((opt: any) => (
          <button
            key={opt.id}
            onClick={() => !revealed && setSelected(opt.id)}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all text-sm",
              selected === opt.id && !revealed && "border-[#10B981] bg-[#EEF0FF]",
              revealed && opt.correct && "border-green-500 bg-green-50",
              revealed && selected === opt.id && !opt.correct && "border-red-400 bg-red-50",
              !selected || (selected !== opt.id && !revealed) ? "border-border hover:border-[#10B981]/40" : ""
            )}
          >
            <span className="font-medium mr-2">{opt.id.toUpperCase()}.</span>{opt.label}
            {revealed && selected === opt.id && (
              <p className="mt-2 text-xs text-muted-foreground">{opt.feedback}</p>
            )}
          </button>
        ))}
      </div>
      {selected && !revealed && (
        <Button onClick={() => setRevealed(true)} className="bg-[#10B981] hover:bg-[#10B981]/90 text-white">
          Submit Answer
        </Button>
      )}
    </div>
  );
}

function QuizRenderer({ item }: { item: any }) {
  return <ScenarioPracticeRenderer item={item} />;
}

function ReflectionRenderer({ item }: { item: any }) {
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const prompts = typeof item.metadataJson === "object" ? (item.metadataJson?.reflectionPrompts ?? []) : [];
  const prompt = prompts[0] || item.description || "Reflect on how this concept applies to your current role and organisation.";
  return (
    <div className="space-y-4">
      <Card className="border-l-4" style={{ borderLeftColor: "#EE8866" }}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-[#EE8866] shrink-0 mt-0.5" />
            <p className="text-base text-foreground leading-relaxed">{prompt}</p>
          </div>
        </CardContent>
      </Card>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your reflection here…"
        className="w-full h-40 p-3 rounded-lg border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
      />
      {!saved ? (
        <Button onClick={() => setSaved(true)} disabled={!answer.trim()} className="bg-[#10B981] hover:bg-[#10B981]/90 text-white">
          Save Reflection
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4" /> Reflection saved
        </div>
      )}
    </div>
  );
}

function CaseStudyRenderer({ item }: { item: any }) {
  const meta = typeof item.metadataJson === "object" ? item.metadataJson : {};
  const sections = meta?.sections || [];
  return (
    <div className="space-y-5">
      <p className="text-base text-foreground leading-relaxed">{item.description}</p>
      {sections.length > 0 ? sections.map((s: any, i: number) => (
        <div key={i} className="space-y-2">
          <h4 className="font-semibold text-sm text-foreground">{s.heading}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
        </div>
      )) : (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground italic">
              This case study explores real-world application of {item.title.toLowerCase()}.
              Work through the scenario and consider the key decision points and outcomes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChecklistRenderer({ item }: { item: any }) {
  const meta = typeof item.metadataJson === "object" ? item.metadataJson : {};
  const items = meta?.checklistItems || [
    "Review current policies and procedures",
    "Identify key stakeholders",
    "Assess current capability gaps",
    "Define success metrics",
    "Create implementation timeline",
  ];
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{item.description}</p>
      {items.map((it: string, i: number) => (
        <label key={i} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => setChecked(prev => {
              const next = new Set(prev);
              next.has(i) ? next.delete(i) : next.add(i);
              return next;
            })}
            className="mt-0.5 w-4 h-4 rounded accent-[#10B981]"
          />
          <span className={cn("text-sm", checked.has(i) && "line-through text-muted-foreground")}>{it}</span>
        </label>
      ))}
      <p className="text-xs text-muted-foreground pt-2">{checked.size} of {items.length} completed</p>
    </div>
  );
}

function InfographicRenderer({ item }: { item: any }) {
  const meta = typeof item.metadataJson === "object" ? item.metadataJson : {};
  const imageUrl = meta?.imageUrl;
  return (
    <div className="space-y-4">
      {imageUrl ? (
        <img src={imageUrl} alt={item.title} className="w-full rounded-lg border border-border" />
      ) : (
        <div className="rounded-lg bg-gradient-to-br from-[#EEF0FF] to-[#F0F9FF] border border-border p-8 text-center">
          <Award className="w-12 h-12 text-[#10B981] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Visual infographic — {item.title}</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </div>
  );
}

function DefaultRenderer({ item }: { item: any }) {
  return <ArticleRenderer item={item} />;
}

const RENDERERS: Record<string, React.ComponentType<{ item: any }>> = {
  article:           ArticleRenderer,
  video:             VideoRenderer,
  scenario_practice: ScenarioPracticeRenderer,
  simulation:        ScenarioPracticeRenderer,
  quiz:              QuizRenderer,
  case_study:        CaseStudyRenderer,
  reflection:        ReflectionRenderer,
  checklist:         ChecklistRenderer,
  infographic:       InfographicRenderer,
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ModulePlayerPage() {
  const [, params] = useRoute("/learning/module/:contentItemId");
  const [, navigate] = useLocation();
  const contentItemId = params?.contentItemId ?? "";
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: item, isLoading, error } = trpc.learning.getContentItem.useQuery(
    { contentItemId },
    { enabled: !!contentItemId }
  );

  const updateProgressMutation = trpc.learning.updateProgress.useMutation();

  // Simulate reading progress
  useEffect(() => {
    if (!item || completed) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 2;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [item, completed]);

  const handleComplete = () => {
    setCompleted(true);
    setProgress(100);
    updateProgressMutation.mutate({
      contentItemId,
      progressPercent: 100,
      status: "completed",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading module…</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Module not found.</p>
        <Button variant="ghost" onClick={() => navigate("/library")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Button>
      </div>
    );
  }

  const meta = typeof item.metadataJson === "object" ? item.metadataJson as Record<string, any> : {};
  const capabilityKey: string = meta?.capabilityKey ?? meta?.capability_key ?? "";
  const capability: string = meta?.capability ?? meta?.capabilityLabel ?? "";
  const description: string = meta?.description ?? meta?.summary ?? "";
  const estimatedMinutes: number = meta?.estimatedMinutes ?? meta?.estimated_minutes ?? Math.round((item.durationSeconds ?? 600) / 60);
  const capColour = CAP_COLOURS[capabilityKey] ?? "#10B981";
  const TypeIcon = CONTENT_TYPE_ICONS[item.contentType] ?? FileText;
  const Renderer = RENDERERS[item.contentType] ?? DefaultRenderer;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-1.5 text-muted-foreground -ml-2">
          <ArrowLeft className="w-4 h-4" /> Content Library
        </Button>
        {completed && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </div>
        )}
      </div>

      {/* Module header card */}
      <Card className="border-t-4" style={{ borderTopColor: capColour }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs gap-1">
                  <TypeIcon className="w-3 h-3" />
                  {item.contentType.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-xs" style={{ borderColor: capColour, color: capColour }}>
                  {capability}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DIFFICULTY_LABELS[item.difficulty ?? 1]}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-foreground">{item.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{estimatedMinutes} min</span>
            {meta?.author && <span>By {meta.author}</span>}
            {meta?.researchCitations && (
              <span className="text-[#10B981]">{meta.researchCitations.length} research citation{meta.researchCitations.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </CardHeader>
        {!completed && (
          <CardContent className="pb-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Reading progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Content renderer */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <Renderer item={item} />
        </CardContent>
      </Card>

      {/* Key takeaways */}
      {meta?.keyTakeaways && meta.keyTakeaways.length > 0 && (
        <Card className="bg-[#EEF0FF]/50 border-[#10B981]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#10B981] flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {meta.keyTakeaways.map((t: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <ChevronRight className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Research citations */}
      {meta?.researchCitations && meta.researchCitations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Research Citations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {meta.researchCitations.map((c: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-3">{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Completion footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={() => navigate("/library")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Button>
        {!completed ? (
          <Button onClick={handleComplete} className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2">
            Mark as Complete <CheckCircle2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => navigate("/learning")} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            Back to Learning Plan <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
