import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, MessageCircle, X, Bot, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

interface DashboardAIChatProps {
  className?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError("Zu viele Anfragen. Bitte warten Sie einen Moment.");
        return;
      }
      if (resp.status === 402) {
        onError("KI-Kontingent erschöpft.");
        return;
      }
      onError(errorData.error || "Fehler bei der Verarbeitung");
      return;
    }

    if (!resp.body) {
      onError("Keine Antwort vom Server");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    console.error("Stream error:", e);
    onError("Verbindungsfehler. Bitte erneut versuchen.");
  }
}

export const DashboardAIChat = ({ className }: DashboardAIChatProps) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [dialogInput, setDialogInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getUserName = useCallback(() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'Du';
  }, [user]);

  useEffect(() => {
    if (greetingLoaded) return;
    
    const loadGreeting = async () => {
      const userName = getUserName();
      let greetingContent = "";
      
      setGreeting(null);
      
      await streamChat({
        messages: [{
          role: 'user',
          content: `Erstelle eine sehr kurze, freundliche Begrüßung (max. 2 Sätze) für ${userName}. 
Erwähne dabei kurz die wichtigste anstehende Aufgabe oder das nächste Audit, das bald fällig ist. 
Beginne mit "Hey ${userName}" und sei locker und persönlich. Keine formellen Floskeln.
Wenn es überfällige Aufgaben gibt, erwähne das kurz als Erinnerung.
Formatiere nichts mit Listen - nur 1-2 fließende Sätze.`
        }],
        onDelta: (chunk) => {
          greetingContent += chunk;
          setGreeting(greetingContent);
        },
        onDone: () => {
          setGreetingLoaded(true);
          if (greetingContent) {
            setConversationHistory([{ role: 'assistant', content: greetingContent }]);
          }
        },
        onError: () => {
          const fallbackGreeting = `Hey ${getUserName()}, willkommen zurück! 👋`;
          setGreeting(fallbackGreeting);
          setGreetingLoaded(true);
          setConversationHistory([{ role: 'assistant', content: fallbackGreeting }]);
        },
      });
    };

    const timer = setTimeout(loadGreeting, 500);
    return () => clearTimeout(timer);
  }, [getUserName, greetingLoaded]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, currentResponse]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userQuery = text.trim();
    const userMessage: Message = { role: 'user', content: userQuery };
    
    setIsLoading(true);
    setCurrentResponse('');

    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);

    let responseContent = "";

    await streamChat({
      messages: updatedHistory,
      onDelta: (chunk) => {
        responseContent += chunk;
        setCurrentResponse(responseContent);
      },
      onDone: () => {
        setIsLoading(false);
        setCurrentResponse(null);
        if (responseContent) {
          setConversationHistory(prev => [...prev, { role: 'assistant', content: responseContent }]);
        }
      },
      onError: (error) => {
        toast.error(error);
        setCurrentResponse(null);
        setIsLoading(false);
        setConversationHistory(conversationHistory);
      },
    });
  }, [isLoading, conversationHistory]);

  // When user types in the hero input, open dialog and transfer text
  const handleHeroInputFocus = () => {
    setChatOpen(true);
    setTimeout(() => {
      if (dialogInputRef.current) {
        dialogInputRef.current.focus();
        if (input.trim()) {
          setDialogInput(input);
          setInput('');
        }
      }
    }, 100);
  };

  const handleHeroInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.length === 1) {
      setChatOpen(true);
      setTimeout(() => {
        if (dialogInputRef.current) {
          setDialogInput(e.target.value);
          setInput('');
          dialogInputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleDialogSend = () => {
    if (!dialogInput.trim()) return;
    handleSend(dialogInput);
    setDialogInput('');
  };

  const handleDialogKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDialogSend();
    }
  };

  const handleReset = () => {
    setConversationHistory([]);
    setCurrentResponse(null);
    setGreetingLoaded(false);
    setGreeting(null);
  };

  return (
    <>
      {/* Hero-style centered input */}
      <div className={cn("relative", className)}>
        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.02] via-card to-accent/[0.02] shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="px-6 py-6 sm:px-10 sm:py-8">
            {/* Greeting */}
            <div className="flex items-center gap-3 mb-5 justify-center">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-h-[1.5rem]">
                {greeting ? (
                  <p className="text-sm text-foreground/80 leading-relaxed animate-fade-in">
                    {greeting}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Centered large input */}
            <div className="max-w-xl mx-auto">
              <div 
                className="relative cursor-text group/input"
                onClick={handleHeroInputFocus}
              >
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-hover/input:text-primary/50 transition-colors" />
                <Input
                  value={input}
                  onChange={handleHeroInputChange}
                  onFocus={handleHeroInputFocus}
                  placeholder="Stelle eine Frage zu deinen Audits, Kunden oder Aufgaben..."
                  className="pl-12 pr-14 h-14 bg-background border-border/60 rounded-2xl text-base shadow-sm hover:shadow-md hover:border-primary/30 focus:shadow-md focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                    tabIndex={-1}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0 gap-0 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/[0.04] to-transparent">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">KI-Assistent</h3>
              <p className="text-xs text-muted-foreground">Frag mich alles zu Audits, Kunden & Zertifikaten</p>
            </div>
            {conversationHistory.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground">
                Zurücksetzen
              </Button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: 'calc(80vh - 140px)', minHeight: '300px' }}>
            {conversationHistory.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted/60 text-foreground rounded-bl-md'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {currentResponse && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/60 px-4 py-2.5 text-sm">
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 leading-relaxed">
                    <ReactMarkdown>{currentResponse}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !currentResponse && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted/60 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-border/50 bg-background">
            <div className="flex gap-2 items-center">
              <Input
                ref={dialogInputRef}
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyDown={handleDialogKeyPress}
                placeholder="Nachricht eingeben..."
                className="flex-1 h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/40 text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleDialogSend}
                size="icon"
                disabled={!dialogInput.trim() || isLoading}
                className="h-11 w-11 rounded-xl shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardAIChat;
