/**
 * v1.4 Change 4 — Coach Affordance Panel
 *
 * Inline coach panel at the bottom of every module page.
 * - Shows "Want to talk this through?" prompt with personalised context
 * - Expands to a lightweight chat interface on click
 * - Conversation persists per module via coaching_conversations table
 * - Uses moduleCoachChat tRPC mutation for context-aware responses
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, Send, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

interface CoachMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

interface ModuleCoachPanelProps {
  moduleId: string;
  moduleTitle: string;
  moduleFormat: string;
  moduleDifficulty?: number;
  moduleCapability: string;
  journeyPosition?: string;
  strategyLinkage?: { initiativeName: string; phase: string } | null;
  className?: string;
}

const DOMAIN_META: Record<string, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "AI Output Evaluation",
  ai_workflow_design:     "AI Workflow Design",
  ai_ethics_trust:        "AI Ethics & Trust",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_change_leadership:   "AI Change Leadership",
};

export default function ModuleCoachPanel({
  moduleId,
  moduleTitle,
  moduleFormat,
  moduleDifficulty,
  moduleCapability,
  journeyPosition,
  strategyLinkage,
  className,
}: ModuleCoachPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted conversation
  const { data: savedConv } = trpc.adaptiveLearning.getCoachingConversation.useQuery(
    { moduleId },
    { enabled: !!moduleId, staleTime: 1000 * 60 }
  );

  const saveConversation = trpc.adaptiveLearning.saveCoachingConversation.useMutation();
  const coachChat = trpc.adaptiveLearning.moduleCoachChat.useMutation();

  // Restore saved conversation when loaded
  useEffect(() => {
    if (savedConv?.conversationJson && Array.isArray(savedConv.conversationJson) && messages.length === 0) {
      setMessages(savedConv.conversationJson as CoachMessage[]);
      if ((savedConv.conversationJson as CoachMessage[]).length > 0) {
        setExpanded(true);
      }
    }
  }, [savedConv]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expanded]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const userMsg: CoachMessage = { role: "user", content, createdAt: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const result = await coachChat.mutateAsync({
        moduleId,
        message: content,
        history: updatedMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        moduleTitle,
        moduleFormat,
        moduleDifficulty,
        moduleCapability,
        journeyPosition,
        strategyLinkage,
      });

      const assistantMsg: CoachMessage = {
        role: "assistant",
        content: result.reply,
        createdAt: Date.now(),
      };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist conversation
      saveConversation.mutate({
        moduleId,
        messages: finalMessages,
      });
    } catch {
      const errMsg: CoachMessage = {
        role: "assistant",
        content: "I'm having trouble responding right now. Please try again in a moment.",
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const domainLabel = DOMAIN_META[moduleCapability] ?? moduleCapability;
  const strategyText = strategyLinkage
    ? `your ${strategyLinkage.initiativeName} initiative`
    : "your specific situation";

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Want to talk this through?</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            The AiQ Coach can help you apply this module to {strategyText} — your {domainLabel} context, your team's readiness profile.
          </p>
          {messages.length > 0 && (
            <p className="text-xs text-primary mt-1">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              {messages.length} message{messages.length === 1 ? "" : "s"} in this conversation
            </p>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded chat area */}
      {expanded && (
        <div className="border-t border-border">
          {/* Messages */}
          <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Sparkles className="h-6 w-6 text-primary/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Start a conversation about <span className="font-medium">{moduleTitle}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {[
                    "How does this apply to my work?",
                    "Give me a practical example",
                    "What should I do first?",
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setInputValue(prompt); }}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground border border-border"
                  )}
                >
                  {msg.role === "assistant"
                    ? <Streamdown className="prose-sm prose-invert max-w-none">{msg.content}</Streamdown>
                    : <p className="leading-relaxed">{msg.content}</p>
                  }
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted/50 border border-border rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5 flex gap-2 items-end">
            <Textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Coach anything about this module…"
              className="min-h-[36px] max-h-24 text-sm resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-8 w-8 p-0 flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
