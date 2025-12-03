import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const dummyResponses: Record<string, string> = {
  'audit': 'Ich kann Ihnen bei der Vorbereitung Ihres nächsten Audits helfen. Welche Zertifizierung benötigen Sie? (SURE, FSC, PEFC, ISCC, ISO 9001, ISO 14001)',
  'dokument': 'Für die Dokumentenvorbereitung empfehle ich, zuerst die Checkliste im Audit-Detail zu prüfen. Soll ich Ihnen die offenen Dokumente für ein bestimmtes Audit anzeigen?',
  'termin': 'Ich kann Ihnen helfen, einen Audit-Termin zu planen. Geben Sie mir bitte den gewünschten Zeitraum und die Zertifizierungsart an.',
  'erinnerung': 'Ich habe eine Erinnerung für Sie erstellt. Sie werden rechtzeitig vor dem Termin benachrichtigt.',
  'checkliste': 'Die Vorbereitungs-Checkliste für Ihr Audit umfasst: 1) Dokumentenprüfung, 2) Schulungsnachweis, 3) Interne Prüfung, 4) Maßnahmenplan. Welchen Punkt möchten Sie bearbeiten?',
  'status': 'Aktueller Status Ihrer Audits:\n• 2 Audits in Vorbereitung\n• 1 Audit überfällig\n• 3 Audits diesen Monat geplant\n\nMöchten Sie Details zu einem bestimmten Audit?',
  'hilfe': 'Ich kann Ihnen bei folgenden Aufgaben helfen:\n• Audit-Vorbereitung\n• Dokumentenmanagement\n• Terminplanung\n• Checklisten-Verwaltung\n• Status-Übersicht\n\nWas möchten Sie tun?',
};

const getResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  for (const [key, response] of Object.entries(dummyResponses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  
  // Default responses for common greetings and questions
  if (lowerMessage.includes('hallo') || lowerMessage.includes('hi') || lowerMessage.includes('guten')) {
    return 'Hallo! Ich bin Ihr Audit-Assistent. Wie kann ich Ihnen heute helfen? Tippen Sie "Hilfe" für eine Übersicht meiner Funktionen.';
  }
  
  if (lowerMessage.includes('danke')) {
    return 'Gerne! Gibt es noch etwas, wobei ich Ihnen helfen kann?';
  }
  
  // Default fallback
  return 'Ich verstehe Ihre Anfrage. In der vollständigen Version werde ich Ihnen dabei helfen können. Momentan kann ich bei Audits, Dokumenten, Terminen, Checklisten und Status-Abfragen unterstützen. Tippen Sie "Hilfe" für mehr Informationen.';
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ich bin Ihr Audit-Assistent. Wie kann ich Ihnen heute helfen?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all duration-300",
          isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">Audit-Assistent</h3>
              <p className="text-xs text-primary-foreground/70">Immer für Sie da</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="bg-primary/10 p-1.5 rounded-full h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-line",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <div className="bg-secondary p-1.5 rounded-full h-fit">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
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
                placeholder="Nachricht eingeben..."
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon" disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
