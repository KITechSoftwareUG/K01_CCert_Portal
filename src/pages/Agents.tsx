import { Bot, Sparkles, Zap, Brain, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockFeatures = [
  { icon: MessageSquare, title: 'Automatische Audit-Kommunikation', desc: 'KI-gestützte E-Mail-Vorlagen und Follow-ups für Auditoren und Kunden.' },
  { icon: Brain, title: 'Intelligente Terminplanung', desc: 'Automatische Vorschläge für optimale Audit-Termine basierend auf Verfügbarkeit.' },
  { icon: Zap, title: 'Dokumenten-Analyse', desc: 'Automatische Prüfung und Kategorisierung von Zertifizierungsdokumenten.' },
  { icon: Sparkles, title: 'Befund-Assistent', desc: 'KI-unterstützte Erstellung und Nachverfolgung von Audit-Befunden.' },
];

const Agents = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Bot className="h-4 w-4" />
          In Entwicklung
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          KI-Agenten
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Intelligente Automatisierung für Ihr Audit- und Zertifizierungsmanagement. Bald verfügbar.
        </p>
      </div>

      {/* Blurred Preview Cards */}
      <div className="relative">
        {/* Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
          <Badge variant="secondary" className="text-base px-5 py-2 shadow-lg gap-2">
            <Sparkles className="h-4 w-4" />
            Kommt bald
          </Badge>
        </div>

        {/* Blurred content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none pointer-events-none blur-[3px]">
          {mockFeatures.map((feature) => (
            <Card key={feature.title} className="border border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
                <div className="mt-4 flex gap-2">
                  <div className="h-2 rounded-full bg-muted flex-1" />
                  <div className="h-2 rounded-full bg-muted w-1/3" />
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="h-2 rounded-full bg-muted w-2/3" />
                  <div className="h-2 rounded-full bg-muted flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Agents;
