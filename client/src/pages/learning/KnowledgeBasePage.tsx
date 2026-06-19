/**
 * Knowledge Base — Curated AI-in-HR resources with search, filtering, and domain linking.
 * Replaces the "coming soon" stub with real content drawn from the platform's domain model.
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useIsPro } from "@/hooks/useIsPro";
import { ProGatePage } from "@/components/ProGate";
import {
  BookMarked, Search, FileText, Video, Link2, Lightbulb,
  GraduationCap, Shield, Cpu, BarChart3, Users, Briefcase, ChevronRight,
  Clock, Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Content Types ───────────────────────────────────────────────────────────

type ResourceType = "article" | "guide" | "video" | "framework" | "case_study";
type DomainKey = "ai_literacy_foundations" | "ai_ethics_trust" | "ai_tools_adoption" | "ai_data_decision" | "ai_change_leadership" | "ai_strategy_governance";

interface KBArticle {
  id: string;
  title: string;
  summary: string;
  type: ResourceType;
  domain: DomainKey;
  readMinutes: number;
  tags: string[];
  source: string;
  featured?: boolean;
}

// ─── Domain Metadata ─────────────────────────────────────────────────────────

const DOMAIN_META: Record<DomainKey, { label: string; shortLabel: string; icon: typeof Lightbulb; colour: string }> = {
  ai_literacy_foundations: { label: "AI Literacy & Foundations", shortLabel: "Literacy", icon: GraduationCap, colour: "#60A5FA" },
  ai_ethics_trust: { label: "Ethics & Trust", shortLabel: "Ethics", icon: Shield, colour: "#A78BFA" },
  ai_tools_adoption: { label: "Tools & Adoption", shortLabel: "Tools", icon: Cpu, colour: "#34D399" },
  ai_data_decision: { label: "Data & Decision-Making", shortLabel: "Data", icon: BarChart3, colour: "#FBBF24" },
  ai_change_leadership: { label: "Change Leadership", shortLabel: "Change", icon: Users, colour: "#F87171" },
  ai_strategy_governance: { label: "Strategy & Governance", shortLabel: "Strategy", icon: Briefcase, colour: "#2DD4BF" },
};

// ─── Curated Content Library ─────────────────────────────────────────────────

const KB_ARTICLES: KBArticle[] = [
  // AI Literacy & Foundations
  { id: "kb-001", title: "What HR Professionals Need to Know About Large Language Models", summary: "A non-technical primer on how LLMs work, their capabilities and limitations, and what this means for HR decision-making. Covers tokenisation, hallucination, and prompt design basics.", type: "article", domain: "ai_literacy_foundations", readMinutes: 8, tags: ["LLM", "fundamentals", "non-technical"], source: "AiQ Platform", featured: true },
  { id: "kb-002", title: "Machine Learning vs. Rules-Based Systems in HR Tech", summary: "Understanding when ML adds value over traditional rules-based approaches. Practical examples from recruitment screening, absence prediction, and workforce planning.", type: "guide", domain: "ai_literacy_foundations", readMinutes: 12, tags: ["ML", "comparison", "HR tech"], source: "AiQ Platform" },
  { id: "kb-003", title: "The HR Professional's AI Vocabulary", summary: "50 essential AI terms explained in plain language with HR-specific examples. From 'algorithm' to 'zero-shot learning' — the vocabulary you need to hold credible conversations with technical teams.", type: "guide", domain: "ai_literacy_foundations", readMinutes: 15, tags: ["vocabulary", "reference", "jargon-free"], source: "AiQ Platform" },
  { id: "kb-004", title: "How AI Models Are Trained: What HR Needs to Understand", summary: "Training data, fine-tuning, and RLHF explained through the lens of HR applications. Why the data your vendor trained on matters for fairness and accuracy.", type: "article", domain: "ai_literacy_foundations", readMinutes: 10, tags: ["training", "data quality", "vendor evaluation"], source: "AiQ Platform" },
  // Ethics & Trust
  { id: "kb-005", title: "Algorithmic Bias in Recruitment: Detection and Mitigation", summary: "Practical framework for identifying bias in AI recruitment tools. Covers disparate impact analysis, proxy variables, and the four-fifths rule applied to AI outputs.", type: "framework", domain: "ai_ethics_trust", readMinutes: 14, tags: ["bias", "recruitment", "fairness"], source: "AiQ Platform", featured: true },
  { id: "kb-006", title: "The EU AI Act: What HR Teams Need to Know", summary: "Practical breakdown of the EU AI Act's high-risk classification for employment systems. Covers documentation requirements, human oversight obligations, and timeline for compliance.", type: "article", domain: "ai_ethics_trust", readMinutes: 11, tags: ["regulation", "EU AI Act", "compliance"], source: "AiQ Platform" },
  { id: "kb-007", title: "Building an AI Ethics Framework for People Decisions", summary: "Step-by-step guide to creating an organisational AI ethics framework specifically for HR. Includes governance structures, escalation paths, and template policies.", type: "framework", domain: "ai_ethics_trust", readMinutes: 18, tags: ["governance", "policy", "framework"], source: "AiQ Platform" },
  { id: "kb-008", title: "Transparency and Explainability in HR AI Systems", summary: "How to communicate AI-assisted decisions to employees and candidates. Covers GDPR Article 22, meaningful information requirements, and practical explanation templates.", type: "guide", domain: "ai_ethics_trust", readMinutes: 9, tags: ["transparency", "GDPR", "communication"], source: "AiQ Platform" },
  // Tools & Adoption
  { id: "kb-009", title: "Evaluating AI Vendors: A Procurement Framework for HR", summary: "Structured evaluation criteria for AI HR tools covering accuracy claims, bias testing, data handling, integration complexity, and total cost of ownership.", type: "framework", domain: "ai_tools_adoption", readMinutes: 16, tags: ["procurement", "vendor", "evaluation"], source: "AiQ Platform", featured: true },
  { id: "kb-010", title: "Prompt Engineering for HR Professionals", summary: "Practical techniques for getting better outputs from generative AI tools in HR contexts. Covers role-setting, chain-of-thought, and output formatting for policy drafting, JD writing, and comms.", type: "guide", domain: "ai_tools_adoption", readMinutes: 12, tags: ["prompts", "generative AI", "practical"], source: "AiQ Platform" },
  { id: "kb-011", title: "AI-Assisted Performance Reviews: Implementation Playbook", summary: "How to introduce AI writing assistance into performance review processes without undermining authenticity. Covers guardrails, manager training, and quality assurance.", type: "case_study", domain: "ai_tools_adoption", readMinutes: 10, tags: ["performance", "implementation", "playbook"], source: "AiQ Platform" },
  { id: "kb-012", title: "Measuring AI Tool Adoption: Metrics That Matter", summary: "Beyond login counts — meaningful metrics for tracking whether AI tools are actually improving HR outcomes. Covers time-to-value, quality uplift, and adoption curves.", type: "article", domain: "ai_tools_adoption", readMinutes: 7, tags: ["metrics", "adoption", "ROI"], source: "AiQ Platform" },
  // Data & Decision-Making
  { id: "kb-013", title: "Data Quality for AI: What HR Teams Control", summary: "The data quality dimensions that directly impact AI accuracy in HR systems. Practical steps to improve completeness, consistency, and timeliness of people data.", type: "guide", domain: "ai_data_decision", readMinutes: 11, tags: ["data quality", "practical", "HRIS"], source: "AiQ Platform" },
  { id: "kb-014", title: "When to Trust AI Recommendations: A Decision Framework", summary: "Structured approach to deciding when AI outputs should inform, advise, or automate people decisions. Covers confidence thresholds, human-in-the-loop design, and escalation triggers.", type: "framework", domain: "ai_data_decision", readMinutes: 13, tags: ["decision-making", "trust", "framework"], source: "AiQ Platform", featured: true },
  { id: "kb-015", title: "People Analytics and AI: Complementary Capabilities", summary: "How traditional people analytics and AI-driven insights work together. Covers descriptive vs. predictive vs. prescriptive analytics and where each adds value.", type: "article", domain: "ai_data_decision", readMinutes: 9, tags: ["analytics", "predictive", "workforce planning"], source: "AiQ Platform" },
  { id: "kb-016", title: "Statistical Literacy for HR: Reading AI Model Outputs", summary: "Understanding confidence intervals, precision/recall, and false positive rates in the context of HR AI tools. No statistics background required.", type: "guide", domain: "ai_data_decision", readMinutes: 14, tags: ["statistics", "interpretation", "non-technical"], source: "AiQ Platform" },
  // Change Leadership
  { id: "kb-017", title: "Leading AI Adoption: Resistance Patterns and Responses", summary: "The five most common resistance patterns when introducing AI into HR teams, with evidence-based response strategies. Covers fear-based, competence-based, and values-based resistance.", type: "guide", domain: "ai_change_leadership", readMinutes: 12, tags: ["resistance", "change management", "leadership"], source: "AiQ Platform", featured: true },
  { id: "kb-018", title: "Building AI Champions in HR: A Peer Influence Model", summary: "How to identify and develop internal AI champions who accelerate adoption through peer influence rather than top-down mandates.", type: "case_study", domain: "ai_change_leadership", readMinutes: 8, tags: ["champions", "peer influence", "culture"], source: "AiQ Platform" },
  { id: "kb-019", title: "Communicating AI Changes to Employees: Templates and Principles", summary: "Communication frameworks for announcing AI-assisted processes. Covers transparency requirements, addressing fears, and maintaining trust during transitions.", type: "guide", domain: "ai_change_leadership", readMinutes: 10, tags: ["communication", "templates", "trust"], source: "AiQ Platform" },
  { id: "kb-020", title: "The HR Operating Model Shift: From Process Owner to AI Orchestrator", summary: "How the HR operating model evolves as AI handles routine processes. New capabilities required, role redesign principles, and transition planning.", type: "article", domain: "ai_change_leadership", readMinutes: 15, tags: ["operating model", "role design", "future of HR"], source: "AiQ Platform" },
  // Strategy & Governance
  { id: "kb-021", title: "Building an AI Governance Framework for HR", summary: "Complete governance framework covering accountability structures, risk registers, audit trails, and incident response for AI in people decisions.", type: "framework", domain: "ai_strategy_governance", readMinutes: 20, tags: ["governance", "framework", "accountability"], source: "AiQ Platform", featured: true },
  { id: "kb-022", title: "AI Strategy for HR: From Experimentation to Scale", summary: "Maturity-stage-appropriate strategy guidance. Covers pilot selection criteria, scaling decision frameworks, and investment prioritisation for AI in HR.", type: "guide", domain: "ai_strategy_governance", readMinutes: 16, tags: ["strategy", "scaling", "maturity"], source: "AiQ Platform" },
  { id: "kb-023", title: "Board Reporting on AI Risk: What Directors Need to See", summary: "How to present AI risk and opportunity to board-level audiences. Covers materiality thresholds, risk appetite statements, and KPI dashboards for AI governance.", type: "article", domain: "ai_strategy_governance", readMinutes: 11, tags: ["board", "reporting", "risk"], source: "AiQ Platform" },
  { id: "kb-024", title: "AI Budget Planning for HR Functions", summary: "Practical budgeting framework for AI initiatives covering vendor costs, internal capability building, change management, and ongoing governance overhead.", type: "guide", domain: "ai_strategy_governance", readMinutes: 13, tags: ["budget", "planning", "business case"], source: "AiQ Platform" },
];

// ─── Type Icons ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ResourceType, typeof FileText> = {
  article: FileText,
  guide: BookMarked,
  video: Video,
  framework: Lightbulb,
  case_study: Link2,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  article: "Article",
  guide: "Guide",
  video: "Video",
  framework: "Framework",
  case_study: "Case Study",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const isPro = useIsPro();
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | "all">("all");
  const [selectedType, setSelectedType] = useState<ResourceType | "all">("all");

  // Pre-select filter based on URL path
  useEffect(() => {
    if (location === "/knowledge/articles") setSelectedType("article");
    else if (location === "/knowledge/guides") setSelectedType("guide");
    else if (location === "/knowledge/glossary") setSelectedType("framework");
    else setSelectedType("all");
  }, [location]);

  if (!isPro) {
    return (
      <DashboardLayout>
        <ProGatePage
          featureName="Knowledge Base"
          description="Access curated articles, guides, frameworks, and case studies on AI in HR. Available on AiQ PRO."
        />
      </DashboardLayout>
    );
  }

  const filtered = useMemo(() => {
    return KB_ARTICLES.filter(a => {
      if (selectedDomain !== "all" && a.domain !== selectedDomain) return false;
      if (selectedType !== "all" && a.type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [search, selectedDomain, selectedType]);

  const featured = useMemo(() => KB_ARTICLES.filter(a => a.featured), []);

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of KB_ARTICLES) {
      counts[a.domain] = (counts[a.domain] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 py-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {KB_ARTICLES.length} curated resources across {Object.keys(DOMAIN_META).length} capability domains
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, guides, and frameworks…"
            className="pl-9 bg-muted/40"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Domain filter chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedDomain === "all" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSelectedDomain("all")}
          >
            All domains ({KB_ARTICLES.length})
          </Button>
          {(Object.entries(DOMAIN_META) as [DomainKey, typeof DOMAIN_META[DomainKey]][]).map(([key, meta]) => (
            <Button
              key={key}
              size="sm"
              variant={selectedDomain === key ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setSelectedDomain(key)}
            >
              <meta.icon className="w-3 h-3" />
              {meta.shortLabel} ({domainCounts[key] ?? 0})
            </Button>
          ))}
        </div>

        {/* Type filter */}
        <Tabs value={selectedType} onValueChange={v => setSelectedType(v as ResourceType | "all")}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6">All types</TabsTrigger>
            <TabsTrigger value="article" className="text-xs h-6">Articles</TabsTrigger>
            <TabsTrigger value="guide" className="text-xs h-6">Guides</TabsTrigger>
            <TabsTrigger value="framework" className="text-xs h-6">Frameworks</TabsTrigger>
            <TabsTrigger value="case_study" className="text-xs h-6">Case Studies</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Featured section (only when no filters active) */}
        {selectedDomain === "all" && selectedType === "all" && !search && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              Featured resources
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {featured.map(article => {
                const meta = DOMAIN_META[article.domain];
                const TypeIcon = TYPE_ICONS[article.type];
                return (
                  <Card key={article.id} className="hover:border-primary/40 hover:shadow-sm transition-all group">
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded flex items-center justify-center shrink-0" style={{ background: `${meta.colour}20` }}>
                          <meta.icon className="h-3.5 w-3.5" style={{ color: meta.colour }} />
                        </div>
                        <Badge variant="outline" className="text-[9px] py-0">{meta.shortLabel}</Badge>
                        <Badge variant="secondary" className="text-[9px] py-0 ml-auto">
                          <TypeIcon className="w-2.5 h-2.5 mr-0.5" />{TYPE_LABELS[article.type]}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground">{article.readMinutes} min read</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Results list */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            {search || selectedDomain !== "all" || selectedType !== "all"
              ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
              : "All resources"}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No resources match your filters</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or domain filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(article => {
                const meta = DOMAIN_META[article.domain];
                const TypeIcon = TYPE_ICONS[article.type];
                return (
                  <div
                    key={article.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${meta.colour}15` }}>
                      <TypeIcon className="h-4 w-4" style={{ color: meta.colour }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{article.summary}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Badge variant="outline" className="text-[9px] py-0 h-4">{meta.shortLabel}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{article.readMinutes} min
                        </span>
                        {article.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                            <Tag className="w-2 h-2" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Domain overview cards */}
        {selectedDomain === "all" && !search && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              Browse by capability domain
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.entries(DOMAIN_META) as [DomainKey, typeof DOMAIN_META[DomainKey]][]).map(([key, meta]) => (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                  onClick={() => setSelectedDomain(key)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${meta.colour}20` }}>
                      <meta.icon className="h-4 w-4" style={{ color: meta.colour }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{meta.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{domainCounts[key] ?? 0} resources</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
