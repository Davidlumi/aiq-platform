/**
 * Admin Assessment Blueprints Page — AiQ Enterprise Platform
 *
 * Canonical admin blueprint management from the build bible:
 * - View all assessment blueprints with question counts
 * - See capability coverage per blueprint
 * - Publish / archive blueprints
 * - View blueprint details with item list
 */
import { useState } from "react";
import { DOMAIN_COLOURS } from "@/lib/domains";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Layers, CheckCircle2, Clock, Archive, ChevronDown, ChevronRight,
  Target, AlertTriangle, BookOpen, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; colour: string; icon: React.ElementType }> = {
  published: { label: "Published", colour: "#228833", icon: CheckCircle2 },
  draft:     { label: "Draft",     colour: "#EE8866", icon: Clock },
  archived:  { label: "Archived",  colour: "#9CA3AF", icon: Archive },
};

// Capability colours imported from @/lib/domains
const CAPABILITY_COLOURS: Record<string, string> = DOMAIN_COLOURS as Record<string, string>;

function BlueprintCard({ blueprint }: { blueprint: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[blueprint.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;
  const config = blueprint.configJson ? (typeof blueprint.configJson === "object" ? blueprint.configJson : JSON.parse(blueprint.configJson as string)) : {};

  return (
    <Card className={cn("transition-colors", expanded && "bg-muted/10")}>
      <CardContent className="p-0">
        <button
          className="w-full text-left p-4 flex items-start gap-4"
          onClick={() => setExpanded(prev => !prev)}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-[#10B981]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{blueprint.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{blueprint.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ color: statusCfg.colour, backgroundColor: `${statusCfg.colour}15` }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {blueprint.itemCount ?? 0} questions
              </span>
              {config.passMark && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Pass mark: {config.passMark}%
                </span>
              )}
              {config.timeLimitMinutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {config.timeLimitMinutes} min
                </span>
              )}
            </div>

            {/* Capability tags */}
            {config.capabilities && Array.isArray(config.capabilities) && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {config.capabilities.map((cap: string) => (
                  <span
                    key={cap}
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ color: CAPABILITY_COLOURS[cap] ?? "#9CA3AF", backgroundColor: `${CAPABILITY_COLOURS[cap] ?? "#9CA3AF"}15` }}
                  >
                    {cap.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-border/50 pt-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Configuration</p>
                <div className="space-y-1.5">
                  {Object.entries(config).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="text-xs font-medium text-foreground">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Actions</p>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1"
                    onClick={() => toast.info("Blueprint editor coming in next release")}
                  >
                    Edit Blueprint
                  </Button>
                  {blueprint.status === "draft" && (
                    <Button
                      size="sm"
                      className="w-full text-xs gap-1 bg-[#228833] hover:bg-[#228833]/90 text-white"
                      onClick={() => toast.info("Blueprint published (demo)")}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Publish
                    </Button>
                  )}
                  {blueprint.status === "published" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs gap-1 text-amber-600 border-amber-200"
                      onClick={() => toast.info("Blueprint archived (demo)")}
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssessmentBlueprintsPage() {
  const { data: blueprints, isLoading } = trpc.assessment.blueprints.useQuery();

  const stats = {
    total: blueprints?.length ?? 0,
    published: blueprints?.filter((b: any) => b.status === "published").length ?? 0,
    draft: blueprints?.filter((b: any) => b.status === "draft").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Blueprints</h1>
          <p className="text-muted-foreground mt-1">
            Manage assessment blueprints, question pools, and scoring configuration
          </p>
        </div>
        <Button
          className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
          onClick={() => toast.info("Blueprint creator coming in next release")}
        >
          <Plus className="w-4 h-4" />
          New Blueprint
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Blueprints", value: stats.total, colour: "#10B981" },
          { label: "Published", value: stats.published, colour: "#228833" },
          { label: "Draft", value: stats.draft, colour: "#EE8866" },
        ].map(stat => (
          <Card key={stat.label} className="text-center p-4">
            <p className="text-2xl font-bold" style={{ color: stat.colour }}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Blueprint list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (blueprints?.length ?? 0) === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No assessment blueprints yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first assessment blueprint</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blueprints?.map((bp: any) => (
            <BlueprintCard key={bp.id} blueprint={bp} />
          ))}
        </div>
      )}
    </div>
  );
}
