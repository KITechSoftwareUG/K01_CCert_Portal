import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { streamChat, AgentInfo, ChatMessage } from '@/lib/chatUtils';
import { processFile, ProcessedFile, ACCEPTED_EXTENSIONS } from '@/lib/fileProcessor';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agent?: AgentInfo;
  attachmentName?: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  role: 'assistant',
  content: 'Hallo! Ich bin Ihr Audit-Assistent mit Zugriff auf Ihre Datenbank. Fragen Sie mich z.B.:\n\n• "Welche Aufgaben sind bei Firma XY offen?"\n• "Welche Audits stehen diese Woche an?"\n• "Zeige mir alle Kunden mit FSC-Zertifizierung"\n\nSie können auch Dateien anhängen (CSV, Excel, PDF, Bilder).',
  timestamp: new Date(),
};

const AgentBadge = memo(({ agent }: { agent: AgentInfo }) => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 font-normal text-muted-foreground border-border/50">
    <span>{agent.icon}</span>
    <span>{agent.name}</span>
  </Badge>
));
AgentBadge.displayName = 'AgentBadge';

const MessageBubble = memo(({ message }: { message: Message }) => (
  <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
    {message.role === 'assistant' && (
      <div className="bg-primary/10 p-1.5 rounded-full h-fit flex-shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
    )}
    <div className="flex flex-col gap-0.5 max-w-[80%]">
      {message.role === 'assistant' && message.agent && message.id !== 'initial' && (
        <AgentBadge agent={message.agent} />
      )}
      <div
        className={cn(
          'px-3 py-2 rounded-xl text-sm',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground rounded-br-sm whitespace-pre-line'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {message.attachmentName && (
          <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
            <Paperclip className="h-3 w-3" />
            <span>{message.attachmentName}</span>
          </div>
        )}
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
    </div>
    {message.role === 'user' && (
      <div className="bg-secondary p-1.5 rounded-full h-fit flex-shrink-0">
        <User className="h-4 w-4 text-secondary-foreground" />
      </div>
    )}
  </div>
));
MessageBubble.displayName = 'MessageBubble';

const TypingIndicator = memo(({ agent }: { agent?: AgentInfo | null }) => (
  <div className="flex gap-2 items-start">
    <div className="bg-primary/10 p-1.5 rounded-full">
      <Bot className="h-4 w-4 text-primary" />
    </div>
    <div className="flex flex-col gap-0.5">
      {agent && <AgentBadge agent={agent} />}
      <div className="bg-muted px-4 py-2 rounded-xl rounded-bl-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
));
TypingIndicator.displayName = 'TypingIndicator';

const FilePreview = memo(({
  file,
  onRemove,
}: {
  file: ProcessedFile;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg text-xs text-muted-foreground border border-border/50 max-w-full">
    {file.kind === 'image' ? (
      <ImageIcon className="h-3 w-3 flex-shrink-0 text-primary" />
    ) : (
      <FileText className="h-3 w-3 flex-shrink-0 text-primary" />
    )}
    <span className="truncate max-w-[160px]">{file.name}</span>
    <button
      onClick={onRemove}
      className="ml-auto flex-shrink-0 hover:text-destructive transition-colors"
      aria-label="Anhang entfernen"
    >
      <X className="h-3 w-3" />
    </button>
  </div>
));
FilePreview.displayName = 'FilePreview';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentInfo | null>(null);
  const [attachedFile, setAttachedFile] = useState<ProcessedFile | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessingFile(true);
    try {
      const processed = await processFile(file);
      setAttachedFile(processed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Datei konnte nicht verarbeitet werden');
    } finally {
      setIsProcessingFile(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !attachedFile) || isTyping) return;

    const userText = input.trim() || (attachedFile ? `Analysiere diese Datei: ${attachedFile.name}` : '');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
      attachmentName: attachedFile?.name,
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    const fileToSend = attachedFile;
    setInput('');
    setAttachedFile(null);
    setIsTyping(true);
    setActiveAgent(null);

    const conversationHistory: ChatMessage[] = messages
      .filter((m) => m.id !== 'initial')
      .map((m) => ({ role: m.role, content: m.content }));
    conversationHistory.push({ role: 'user', content: userInput || userText });

    let assistantContent = '';
    let selectedAgent: AgentInfo | undefined;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id !== 'initial') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent, agent: selectedAgent || m.agent } : m,
          );
        }
        return [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: assistantContent,
            timestamp: new Date(),
            agent: selectedAgent,
          },
        ];
      });
    };

    await streamChat({
      messages: conversationHistory,
      attachedFile: fileToSend,
      onAgentSelected: (agent) => {
        selectedAgent = agent;
        setActiveAgent(agent);
      },
      onDelta: upsertAssistant,
      onDone: () => {
        setIsTyping(false);
        setActiveAgent(null);
      },
      onError: (error) => {
        toast.error(error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Entschuldigung, es gab einen Fehler: ${error}`,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setActiveAgent(null);
      },
    });
  }, [input, attachedFile, isTyping, messages]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !isTyping;

  return (
    <>
      <Button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all duration-300',
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
        )}
        size="icon"
        aria-label={isOpen ? 'Chat schließen' : 'Chat öffnen'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-scale-in">
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">Audit-Assistent</h3>
              <p className="text-xs text-primary-foreground/70">Agent-Orchestrierung aktiv</p>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                <TypingIndicator agent={activeAgent} />
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border bg-background space-y-2">
            {attachedFile && (
              <FilePreview file={attachedFile} onRemove={() => setAttachedFile(null)} />
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Datei auswählen"
              />
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isProcessingFile}
                aria-label="Datei anhängen"
                title="Datei anhängen (CSV, Excel, PDF, Bilder)"
              >
                {isProcessingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
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
                disabled={!canSend}
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
