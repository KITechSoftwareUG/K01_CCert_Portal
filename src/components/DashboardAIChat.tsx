import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, MessageCircle, X, Bot, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { streamChat } from '@/lib/chatUtils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useNavigate } from 'react-router-dom';

const markdownLinkComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-primary underline hover:text-primary/80 cursor-pointer"
      onClick={(e) => {
        if (href && (href.startsWith('/') || href.includes(window.location.origin))) {
          e.preventDefault();
          const path = href.startsWith('/') ? href : new URL(href).pathname;
          window.location.href = path;
        }
      }}
    >
      {children}
    </a>
  ),
};

interface DashboardAIChatProps {
  className?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_PROMPTS = [
  "Welche Zertifikate laufen in den nächsten 3 Monaten ab?",
  "Zeige alle Audits von Carsten Sellmann",
  "Welche Aufgaben sind überfällig?",
  "Erstelle eine Übersicht aller Kunden in Mecklenburg-Vorpommern",
];

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
        },
        onError: () => {
          const fallbackGreeting = `Hey ${getUserName()}, willkommen zurück! 👋`;
          setGreeting(fallbackGreeting);
          setGreetingLoaded(true);
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

  const handleExampleClick = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <>
      {/* Hero-style centered input */}
      <div className={cn("relative", className)}>
        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.02] via-card to-accent/[0.02] shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="px-4 py-4 sm:px-10 sm:py-8">
            {/* Greeting */}
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 justify-center">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-h-[1.5rem] flex-1">
                {greeting ? (
                  <div className="text-xs sm:text-sm text-foreground/80 leading-relaxed animate-fade-in prose prose-sm max-w-none prose-p:my-0">
                    <ReactMarkdown components={markdownLinkComponents}>{greeting}</ReactMarkdown>
                  </div>
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
                <MessageCircle className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/30 group-hover/input:text-primary/50 transition-colors" />
                <Input
                  value={input}
                  onChange={handleHeroInputChange}
                  onFocus={handleHeroInputFocus}
                  placeholder="Frag mich etwas..."
                  className="pl-10 sm:pl-12 pr-12 sm:pr-14 h-12 sm:h-14 bg-background border-border/60 rounded-2xl text-sm sm:text-base shadow-sm hover:shadow-md hover:border-primary/30 focus:shadow-md focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                  readOnly
                />
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                    tabIndex={-1}
                  >
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent 
          className="sm:max-w-2xl p-0 gap-0 rounded-none sm:rounded-2xl overflow-hidden w-full h-full sm:h-[80vh] sm:w-auto fixed inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] flex flex-col"
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogTitle>KI-Assistent</DialogTitle>
          </VisuallyHidden>
          
          {/* Header */}
          <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 bg-gradient-to-r from-primary/[0.04] to-transparent">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">KI-Assistent</h3>
              <p className="text-xs text-muted-foreground truncate">Audits, Kunden & Zertifikate</p>
            </div>
            {conversationHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                Zurücksetzen
              </Button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0">
            {/* Greeting (display only, not in API history) */}
            {greeting && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/60 px-4 py-2.5 text-sm">
                  <div className="prose prose-sm max-w-none prose-p:my-1 leading-relaxed">
                    <ReactMarkdown components={markdownLinkComponents}>{greeting}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Example prompts when no conversation yet */}
            {conversationHistory.length === 0 && !isLoading && greetingLoaded && (
              <div className="flex flex-wrap gap-2 pt-2">
                {EXAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

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
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 leading-relaxed">
                      <ReactMarkdown components={markdownLinkComponents}>{msg.content}</ReactMarkdown>
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
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 leading-relaxed">
                    <ReactMarkdown components={markdownLinkComponents}>{currentResponse}</ReactMarkdown>
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
          <div className="shrink-0 px-3 sm:px-5 py-3 sm:py-4 border-t border-border/50 bg-background safe-area-bottom">
            <div className="flex gap-2 items-center">
              <Input
                ref={dialogInputRef}
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyDown={handleDialogKeyPress}
                placeholder="Nachricht eingeben..."
                className="flex-1 h-10 sm:h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/40 text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleDialogSend}
                size="icon"
                disabled={!dialogInput.trim() || isLoading}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shadow-sm"
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