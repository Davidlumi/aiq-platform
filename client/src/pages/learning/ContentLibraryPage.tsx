import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const MODALITY_COLORS: Record<string, string> = {
  microlearning: "bg-blue-100 text-blue-800",
  scenario: "bg-purple-100 text-purple-800",
  simulation: "bg-amber-100 text-amber-800",
  coach_prompt: "bg-emerald-100 text-emerald-800",
  video: "bg-red-100 text-red-800",
  article: "bg-slate-100 text-slate-800",
};

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState<string>("all");

  const { data, isLoading } = trpc.learning.contentLibrary.useQuery({
    contentType: modality === "all" ? undefined : modality,
  });

  const filtered = ((data as any)?.items ?? []).filter((item: any) =>
    !search || item.title?.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Library</h1>
        <p className="text-muted-foreground mt-1">Browse all available learning content</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={modality} onValueChange={setModality}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Modality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modalities</SelectItem>
            <SelectItem value="microlearning">Microlearning</SelectItem>
            <SelectItem value="scenario">Scenario</SelectItem>
            <SelectItem value="simulation">Simulation</SelectItem>
            <SelectItem value="coach_prompt">Coach Prompt</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="article">Article</SelectItem>
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
          <p className="text-muted-foreground">No content found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</p>
                  {item.modality && (
                    <Badge className={cn("text-xs flex-shrink-0", MODALITY_COLORS[item.modality] ?? "bg-muted text-muted-foreground")}>
                      {item.modality.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  {item.estimatedMinutes && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.estimatedMinutes} min
                    </span>
                  )}
                  {item.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      Level {item.difficulty}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
