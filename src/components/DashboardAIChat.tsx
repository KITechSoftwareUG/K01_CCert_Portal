import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, X, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
          const fallbackGreeting = `Hey ${userName}, willkommen zurück! 👋`;
          setGreeting(fallbackGreeting);
          setGreetingLoaded(true);
          setConversationHistory([{ role: 'assistant', content: fallbackGreeting }]);
        },
      });
    };

    const timer = setTimeout(loadGreeting, 500);
    return () => clearTimeout(timer);
  }, [getUserName, greetingLoaded]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    const userMessage: Message = { role: 'user', content: userQuery };
    
    setInput('');
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
  }, [input, isLoading, conversationHistory]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearResponse = useCallback(() => {
    setCurrentResponse(null);
    inputRef.current?.focus();
  }, []);

  const displayResponse = currentResponse || 
    (conversationHistory.length > 1 
      ? conversationHistory.slice(-1)[0]?.role === 'assistant' 
        ? conversationHistory.slice(-1)[0]?.content 
        : null 
      : null);

  return (
    <div className={cn("relative", className)}>
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {/* Subtle gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* Greeting with avatar */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-h-[1.5rem] pt-1">
              {greeting ? (
                <p className="text-sm text-foreground/80 leading-relaxed animate-fade-in">
                  {greeting}
                </p>
              ) : (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>

          {/* Centered input area */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Stell eine Frage zu deinen Audits, Kunden oder Zertifizierungen..."
                  className="pl-10 pr-4 h-11 bg-muted/40 border-border/40 rounded-xl text-sm focus:bg-background focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleSend} 
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-11 w-11 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Response Area */}
          {displayResponse && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="relative bg-muted/30 rounded-xl p-4 border border-border/30">
                <button
                  onClick={clearResponse}
                  className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-background/80 transition-colors"
                  aria-label="Schließen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="pr-7 prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/85 prose-li:text-foreground/85 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 text-sm leading-relaxed">
                  <ReactMarkdown>{displayResponse}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAIChat;
