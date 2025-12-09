import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CHATBOT_RESPONSES } from '@/lib/constants';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  // Check for keyword matches
  for (const [key, response] of Object.entries(CHATBOT_RESPONSES)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  
  // Greetings
  if (lowerMessage.match(/^(hallo|hi|guten|moin|servus)/)) {
    return 'Hallo! Ich bin Ihr Audit-Assistent. Wie kann ich Ihnen heute helfen? Tippen Sie "Hilfe" für eine Übersicht meiner Funktionen.';
  }
  
  // Thanks
  if (lowerMessage.includes('danke')) {
    return 'Gerne! Gibt es noch etwas, wobei ich Ihnen helfen kann?';
  }
  
  // Default fallback
  return 'Ich verstehe Ihre Anfrage. In der vollständigen Version werde ich Ihnen dabei helfen können. Momentan kann ich bei Audits, Dokumenten, Terminen, Checklisten und Status-Abfragen unterstützen. Tippen Sie "Hilfe" für mehr Informationen.';
};

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  role: 'assistant',
  content: 'Hallo! Ich bin Ihr Audit-Assistent. Wie kann ich Ihnen heute helfen?',
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
      <div className="bg-primary/10 p-1.5 rounded-full h-fit">
        <Bot className="h-4 w-4 text-primary" />
      </div>
    )}
    <div
      className={cn(
        'max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-line',
        message.role === 'user'
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
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
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

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

    // Simulate typing delay
    const delay = 800 + Math.random() * 500;
    setTimeout(() => {
      const response = getResponse(userInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, delay);
  }, [input]);

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
              <p className="text-xs text-primary-foreground/70">Immer für Sie da</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
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
                aria-label="Nachricht eingeben"
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={!input.trim() || isTyping}
                aria-label="Nachricht senden"
              >
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
