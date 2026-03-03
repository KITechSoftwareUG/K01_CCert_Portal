import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { streamChat } from '@/lib/chatUtils';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  role: 'assistant',
  content: 'Hallo! Ich bin Ihr Audit-Assistent mit Zugriff auf Ihre Datenbank. Fragen Sie mich z.B.:\n\n• "Welche Aufgaben sind bei Firma XY offen?"\n• "Welche Audits stehen diese Woche an?"\n• "Zeige mir alle Kunden mit FSC-Zertifizierung"',
  timestamp: new Date(),
};

const MessageBubble = memo(({ message }: { message: Message }) => (
  <div
    className={cn(
      'flex gap-2',
      message.role === 'user' ? 'justify-end' : 'justify-start'
    )}
  >
    {message.role === 'assistant' && (
      <div className="bg-primary/10 p-1.5 rounded-full h-fit flex-shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
    )}
    <div
      className={cn(
        'max-w-[80%] px-3 py-2 rounded-xl text-sm',
        message.role === 'user'
          ? 'bg-primary text-primary-foreground rounded-br-sm whitespace-pre-line'
          : 'bg-muted text-foreground rounded-bl-sm'
      )}
    >
      {message.role === 'assistant' ? (
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 leading-relaxed">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
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
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        message.content
      )}
    </div>
    {message.role === 'user' && (
      <div className="bg-secondary p-1.5 rounded-full h-fit flex-shrink-0">
        <User className="h-4 w-4 text-secondary-foreground" />
      </div>
    )}
  </div>
));

MessageBubble.displayName = 'MessageBubble';

const TypingIndicator = memo(() => (
  <div className="flex gap-2 items-center">
    <div className="bg-primary/10 p-1.5 rounded-full">
      <Bot className="h-4 w-4 text-primary" />
    </div>
    <div className="bg-muted px-4 py-2 rounded-xl rounded-bl-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // Build conversation history for API
    const conversationHistory = messages
      .filter(m => m.id !== 'initial')
      .map(m => ({ role: m.role, content: m.content }));
    conversationHistory.push({ role: 'user', content: userInput });

    let assistantContent = "";

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id !== "initial") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    await streamChat({
      messages: conversationHistory,
      onDelta: upsertAssistant,
      onDone: () => setIsTyping(false),
      onError: (error) => {
        toast.error(error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Entschuldigung, es gab einen Fehler: ${error}`,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      },
    });
  }, [input, isTyping, messages]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all duration-300',
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
        )}
        size="icon"
        aria-label={isOpen ? 'Chat schließen' : 'Chat öffnen'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">Audit-Assistent</h3>
              <p className="text-xs text-primary-foreground/70">Mit Datenbankzugriff</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                <TypingIndicator />
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Frage zur Datenbank..."
                className="flex-1"
                aria-label="Nachricht eingeben"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={!input.trim() || isTyping}
                aria-label="Nachricht senden"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
