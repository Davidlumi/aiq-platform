import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTENT_TYPE_COLORS: Record<string, string> = {
  micro_lesson: "bg-blue-100 text-blue-800",
  scenario: "bg-purple-100 text-purple-800",
  scenario_practice: "bg-purple-100 text-purple-800",
  simulation: "bg-amber-100 text-amber-800",
  coach_prompt: "bg-emerald-100 text-emerald-800",
  video: "bg-red-100 text-red-800",
  article: "bg-slate-100 text-slate-800",
  quiz: "bg-pink-100 text-pink-800",
  walkthrough: "bg-cyan-100 text-cyan-800",
  worked_example: "bg-indigo-100 text-indigo-800",
  checklist: "bg-orange-100 text-orange-800",
  reflection: "bg-teal-100 text-teal-800",
  nudge: "bg-yellow-100 text-yellow-800",
};

function formatDuration(seconds: number): string | null {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  const { data, isLoading } = trpc.learning.contentLibrary.useQuery({
    contentType: contentTypeFilter === "all" ? undefined : contentTypeFilter,
  });

  const items: any[] = (data as any)?.items ?? [];
  const filtered = items.filter((item: any) =>
    !search || item.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Library</h1>
        <p className="text-muted-foreground mt-1">Browse all available learning content</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="micro_lesson">Micro Lesson</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="scenario">Scenario</SelectItem>
            <SelectItem value="scenario_practice">Scenario Practice</SelectItem>
            <SelectItem value="simulation">Simulation</SelectItem>
            <SelectItem value="coach_prompt">Coach Prompt</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="walkthrough">Walkthrough</SelectItem>
            <SelectItem value="worked_example">Worked Example</SelectItem>
            <SelectItem value="checklist">Checklist</SelectItem>
            <SelectItem value="reflection">Reflection</SelectItem>
            <SelectItem value="nudge">Nudge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No content found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => {
            const duration = formatDuration(item.durationSeconds);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.contentType && (
                      <Badge className={cn("text-xs flex-shrink-0", CONTENT_TYPE_COLORS[item.contentType] ?? "bg-muted text-muted-foreground")}>
                        {item.contentType.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                    {item.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        Level {item.difficulty}
                      </Badge>
                    )}
                  </div>

                  {item.progress && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-xs text-emerald-600 font-medium">
                        {item.progress.completedAt ? "✓ Completed" : `${item.progress.progressPct ?? 0}% complete`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
