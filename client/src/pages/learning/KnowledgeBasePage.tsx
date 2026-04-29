import DashboardLayout from "@/components/DashboardLayout";
import { BookMarked, Search, FileText, Video, Link2, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const TOPICS = [
  { icon: Lightbulb, label: "AI Fundamentals", count: 12, tag: "Foundation" },
  { icon: FileText,  label: "Prompt Engineering", count: 8, tag: "Practical" },
  { icon: Video,     label: "AI Ethics & Bias",   count: 6, tag: "Governance" },
  { icon: Link2,     label: "Workflow Automation", count: 9, tag: "Practical" },
  { icon: FileText,  label: "AI in Recruitment",  count: 7, tag: "Applied" },
  { icon: Lightbulb, label: "Change Leadership",  count: 5, tag: "Strategy" },
];

export default function KnowledgeBasePage() {
  function handleClick() {
    toast("Coming soon - the Knowledge Base is being built.");
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Curated resources to build your AI capability
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">Coming soon</Badge>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, guides, and resources…"
            className="pl-9 bg-muted/40"
            onClick={handleClick}
            readOnly
          />
        </div>

        {/* Topic cards */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Browse by topic
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOPICS.map(topic => (
              <Card
                key={topic.label}
                className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                onClick={handleClick}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <topic.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{topic.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{topic.count} resources</p>
                    <Badge variant="outline" className="text-[10px] mt-1.5 py-0">{topic.tag}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty state notice */}
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <BookMarked className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Full content launching soon</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
            Articles, guides, and curated resources will appear here once the Knowledge Base is live.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
