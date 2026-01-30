import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
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
      // Capitalize first letter
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

    // Small delay to make it feel more natural
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
    <div className={cn("space-y-3", className)}>
      {/* Greeting Message */}
      <div className="min-h-[2rem]">
        {greeting ? (
          <p className="text-lg text-muted-foreground animate-fade-in">
            <Sparkles className="inline h-4 w-4 mr-2 text-primary" />
            {greeting}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Lade personalisierte Begrüßung...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Frag mich etwas zur Datenbank..."
            className="pr-4 bg-background/50 border-border/50 focus:bg-background transition-colors"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleSend} 
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0"
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
        <div 
          className="bg-muted/50 rounded-lg p-4 border border-border/50 animate-fade-in cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={clearResponse}
          title="Klicken zum Schließen"
        >
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground prose-li:text-foreground">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">Klicken zum Schließen</p>
        </div>
      )}
    </div>
  );
};

export default DashboardAIChat;
