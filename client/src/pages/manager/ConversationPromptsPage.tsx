/**
 * ConversationPromptsPage - Wireframe M3 visual language
 * Dark navy brand theme (AiQ Design System)
 *
 * Per-person insight cards with observation, suggested action,
 * and a suggested opening script. Priority / development / recognition.
 */
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLevelFromScore, getLevelChipStyle } from "@/lib/level-utils";

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  high:   { label: "High priority",   bg: "oklch(18% 0.040 27)",  text: "#F87171" },
  medium: { label: "Medium priority", bg: "oklch(18% 0.040 68)",  text: "#FCD34D" },
  low:    { label: "Low priority",    bg: "oklch(18% 0.040 142)", text: "#4ADE80" },
};

function PromptCard({ prompt }: {
  prompt: {
    memberId: string;
    memberName: string;
    observation: string;
    suggestedAction: string;
    priority: "high" | "medium" | "low";
    patternId: string;
  };
}) {
  const cfg = PRIORITY_CONFIG[prompt.priority] ?? PRIORITY_CONFIG.medium;
  const initials = prompt.memberName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const openingScripts: Record<string, string> = {
    plan_unstarted: `"I noticed your development plan has been ready for a few weeks. I wanted to check in - have you had a chance to look at it? Is there anything getting in the way of getting started?"`,
    plan_stalled: `"I can see your development plan has been quiet recently. How are things going? Is the plan still feeling relevant, or would it help to revisit the priorities?"`,
    reassessment_overdue: `"You've made good progress on your modules - well done. I think it's worth scheduling your reassessment now to see how that development has translated into capability. Would you be up for that?"`,
    foundation_gap_persisting: `"I want to have an honest conversation about your assessment results. You've been in the Foundation Gap category for a while, and I want to make sure we're giving you the right support. Can we look at this together?"`,
    sustained_developing: `"Your scores have been consistent, which is good - but I want to make sure you're being stretched in the right areas. Are your current responsibilities giving you opportunities to use AI tools in ways that push your capability?"`,
    intervention_succeeded: `"I wanted to take a moment to acknowledge the progress you've made. Your reassessment shows real improvement since you completed those modules. That's a meaningful result - how are you feeling about it?"`,
    confidence_capability_gap: `"Something interesting came up in your assessment results that I'd like to explore with you. Your confidence levels and your measured capability are quite different - I'd love to understand your perspective on that."`,
    new_member_first_assessment: `"Now that you've completed your first assessment, I wanted to sit down and walk through the results with you. How did you find the experience, and what stood out to you?"`,
  };

  const script = openingScripts[prompt.patternId] ?? `"I'd like to discuss your recent assessment results and development progress. When would be a good time to connect?"`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-md p-5">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground">{prompt.memberName}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
          </div>
        </div>
        <Link href={`/people/${prompt.memberId}`}>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 flex-shrink-0">View profile</Button>
        </Link>
      </div>

      {/* Observation */}
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-widest mb-1.5 text-muted-foreground">What the data shows</p>
        <p className="text-sm leading-relaxed text-foreground">{prompt.observation}</p>
      </div>

      {/* Suggested action */}
      <div className="mb-3 p-3 rounded-lg border border-border" style={{ background: "oklch(17% 0.028 240)" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-1 text-muted-foreground">Suggested action</p>
        <p className="text-sm text-foreground">{prompt.suggestedAction}</p>
      </div>

      {/* Opening script */}
      <div className="p-3 rounded-lg" style={{ background: "oklch(18% 0.040 250)", border: "0.5px solid oklch(30% 0.080 250)" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: "#60A5FA" }}>Suggested opening</p>
        <p className="text-sm italic leading-relaxed" style={{ color: "#93C5FD" }}>{script}</p>
      </div>
    </div>
  );
}

export default function ConversationPromptsPage() {
  const { data, isLoading } = trpc.dashboardV2.manager.conversationPrompts.useQuery();

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Manager tools</p>
          <h1 className="text-lg font-semibold text-foreground">Conversation Prompts</h1>
          <p className="text-xs mt-1 text-muted-foreground">Data-driven prompts to guide meaningful 1:1 conversations</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!data?.prompts || data.prompts.length === 0) && (
        <div className="bg-card rounded-xl border border-border shadow-md p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "oklch(22% 0.030 240)" }}>
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No prompts available yet</p>
          <p className="text-xs max-w-xs text-muted-foreground">
            Conversation prompts are generated when your team members complete assessments and development activities. Check back after your team has been assessed.
          </p>
          <Link href="/people">
            <Button size="sm" variant="outline" className="gap-1.5 mt-2">
              <Users className="w-3.5 h-3.5" />View team
            </Button>
          </Link>
        </div>
      )}

      {/* Prompt cards */}
      {!isLoading && data?.prompts && data.prompts.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(18% 0.040 250)", border: "0.5px solid oklch(30% 0.080 250)" }}>
            <MessageSquare className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
            <p className="text-xs" style={{ color: "#93C5FD" }}>
              {data.prompts.length} conversation prompt{data.prompts.length !== 1 ? "s" : ""} · sorted by priority
            </p>
          </div>
          <div className="space-y-4">
            {data.prompts.map((prompt, i) => (
              <PromptCard key={`${prompt.memberId}-${i}`} prompt={prompt} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
