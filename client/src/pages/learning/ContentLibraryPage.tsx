/**
 * Content Library Page — AiQ Enterprise Platform
 *
 * Canonical learner view from the build bible:
 * - Browse all 80 real learning modules
 * - Filter by content type and capability area
 * - Search by title
 * - Progress indicators per item
 * - Brand-compliant modality badges
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Search, Target, CheckCircle2, Play, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Modality Config ──────────────────────────────────────────────────────────

const MODALITY_CONFIG: Record<string, { label: string; color: string }> = {
  micro_lesson:      { label: "Micro",        color: "#10B981" },
  scenario:          { label: "Scenario",     color: "#AA3377" },
  scenario_practice: { label: "Practice",     color: "#AA3377" },
  simulation:        { label: "Simulation",   color: "#EE8866" },
  coach_prompt:      { label: "Coaching",     color: "#228833" },
  video:             { label: "Video",        color: "#EE6677" },
  article:           { label: "Article",      color: "#66CCEE" },
  quiz:              { label: "Quiz",         color: "#4477AA" },
  walkthrough:       { label: "Walkthrough",  color: "#4477AA" },
  worked_example:    { label: "Example",      color: "#AA3377" },
  checklist:         { label: "Checklist",    color: "#228833" },
  reflection:        { label: "Reflection",   color: "#228833" },
  nudge:             { label: "Nudge",        color: "#EE8866" },
};

const CAPABILITY_COLORS: Record<string, string> = {
  ai_interaction:      "#4477AA",
  prioritisation:     "#AA3377",
  validation:         "#228833",
  ai_output_evaluation:"#228833",
  ai_ethics_trust:     "#AA3377",
  ai_change_leadership:"#D97706",
  data_interpretation:"#BBBBBB",
};

function formatDuration(seconds: number): string | null {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ item }: { item: any }) {
  const [, navigate] = useLocation();
  const duration = formatDuration(item.durationSeconds);
  const modality = MODALITY_CONFIG[item.contentType] ?? { label: item.contentType, color: "#9CA3AF" };

  // Parse capability from metadata
  let capabilityArea = "";
  try {
    const meta = typeof item.metadataJson === "string"
      ? JSON.parse(item.metadataJson)
      : (item.metadataJson ?? {});
    capabilityArea = meta.capability_area ?? (meta.target_capabilities_list ?? [])[0] ?? "";
  } catch {}

  const capColor = CAPABILITY_COLORS[capabilityArea?.toLowerCase()] ?? "#9CA3AF";
  const isCompleted = !!item.progress?.completedAt;
  const progressPct = item.progress?.progressPct ?? 0;

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer border-border",
        isCompleted && "opacity-75"
      )}
      onClick={() => navigate(`/learning/module/${item.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Type badge + duration */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: modality.color, backgroundColor: `${modality.color}15` }}
          >
            {modality.label}
          </span>
          {duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-[#10B981] transition-colors line-clamp-2">
          {item.title}
        </p>

        {/* Capability area */}
        {capabilityArea && (
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3" style={{ color: capColor }} />
            <span className="text-xs font-medium capitalize" style={{ color: capColor }}>
              {capabilityArea.replace(/_/g, " ")}
            </span>
          </div>
        )}

        {/* Difficulty */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          {item.difficulty ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(d => (
                <div
                  key={d}
                  className="w-1.5 h-3 rounded-sm"
                  style={{
                    backgroundColor: d <= item.difficulty ? "#10B981" : "#E5E7EB",
                  }}
                />
              ))}
            </div>
          ) : <div />}

          {isCompleted ? (
            <span className="text-xs text-[#228833] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          ) : progressPct > 0 ? (
            <span className="text-xs text-[#10B981] font-medium flex items-center gap-1">
              <Play className="w-3 h-3" />
              {progressPct}%
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#10B981] transition-colors" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CAPABILITY_OPTIONS = [
  { value: "all", label: "All capabilities" },
  { value: "ai_interaction", label: "AI Interaction" },
  { value: "prioritisation", label: "Prioritisation" },
  { value: "validation", label: "Validation" },
  { value: "ai_output_evaluation", label: "Output Evaluation" },
  { value: "ai_ethics_trust", label: "Ethics & Trust" },
  { value: "ai_change_leadership", label: "Change Leadership" },
  { value: "data_interpretation", label: "Data Interpretation" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "micro_lesson", label: "Micro Lesson" },
  { value: "video", label: "Video" },
  { value: "scenario", label: "Scenario" },
  { value: "simulation", label: "Simulation" },
  { value: "coach_prompt", label: "Coaching" },
  { value: "quiz", label: "Quiz" },
  { value: "reflection", label: "Reflection" },
  { value: "article", label: "Article" },
];

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [capabilityFilter, setCapabilityFilter] = useState("all");

  const { data, isLoading } = trpc.learning.contentLibrary.useQuery({
    contentType: typeFilter === "all" ? undefined : typeFilter,
    pageSize: 200,
  });

  const items: any[] = (data as any)?.items ?? [];

  // Client-side filtering for search and capability
  const filtered = items.filter((item: any) => {
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;

    if (capabilityFilter !== "all") {
      let capabilityArea = "";
      try {
        const meta = typeof item.metadataJson === "string"
          ? JSON.parse(item.metadataJson)
          : (item.metadataJson ?? {});
        capabilityArea = (meta.capability_area ?? (meta.target_capabilities_list ?? [])[0] ?? "").toLowerCase();
      } catch {}
      if (!capabilityArea.includes(capabilityFilter)) return false;
    }

    return true;
  });

  const completedCount = items.filter((i: any) => i.progress?.completedAt).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">Content Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} modules available
            {completedCount > 0 && ` · ${completedCount} completed`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search modules…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Capability" />
          </SelectTrigger>
          <SelectContent>
            {CAPABILITY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || typeFilter !== "all" || capabilityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setTypeFilter("all"); setCapabilityFilter("all"); }}
            className="text-xs h-9"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (search || typeFilter !== "all" || capabilityFilter !== "all") && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-muted/10">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">No modules found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item: any) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
