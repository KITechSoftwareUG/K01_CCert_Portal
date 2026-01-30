import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, MessageCircle, X } from 'lucide-react';
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
  const [response, setResponse] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user's first name from email or metadata
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

  // Load personalized greeting on mount
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
        },
        onError: () => {
          setGreeting(`Hey ${userName}, willkommen zurück! 👋`);
          setGreetingLoaded(true);
        },
      });
    };

    const timer = setTimeout(loadGreeting, 500);
    return () => clearTimeout(timer);
  }, [getUserName, greetingLoaded]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    setIsLoading(true);
    setResponse('');

    let responseContent = "";

    await streamChat({
      messages: [{ role: 'user', content: userQuery }],
      onDelta: (chunk) => {
        responseContent += chunk;
        setResponse(responseContent);
      },
      onDone: () => {
        setIsLoading(false);
      },
      onError: (error) => {
        toast.error(error);
        setResponse(null);
        setIsLoading(false);
      },
    });
  }, [input, isLoading]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearResponse = useCallback(() => {
    setResponse(null);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
      </div>

      {/* Main container */}
      <div className="relative backdrop-blur-sm bg-gradient-to-br from-card/80 via-card/60 to-card/40 rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        {/* Header accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary/50" />

        <div className="p-5 space-y-4">
          {/* AI Icon and Greeting */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            
            <div className="flex-1 min-h-[2.5rem] pt-1">
              {greeting ? (
                <p className="text-base text-foreground/90 leading-relaxed animate-fade-in">
                  {greeting}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Einen Moment...</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Stelle eine Frage zur Datenbank..."
                className="pl-10 pr-4 h-11 bg-background/60 border-border/40 rounded-xl focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleSend} 
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Response Area */}
          {response && (
            <div className="animate-slide-up">
              <div className="relative bg-gradient-to-br from-muted/60 via-muted/40 to-muted/20 rounded-xl p-4 border border-border/30 shadow-inner">
                {/* Close button */}
                <button
                  onClick={clearResponse}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-background/50 transition-colors"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="pr-8 prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{response}</ReactMarkdown>
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
