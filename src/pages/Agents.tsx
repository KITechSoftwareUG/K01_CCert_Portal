import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Scale,
  FileSearch,
  ClipboardList,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useRunAgent,
  AgentType,
  MassenbilanzResult,
  BefundResult,
  BerichtResult,
  BeraterResult,
} from "@/hooks/useAgents";
import { useAudits } from "@/hooks/useAudits";
import { AUDIT_TYPE_LABELS } from "@/lib/constants";

// ─── Agent Config ──────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "massenbilanz" as AgentType,
    icon: Scale,
    title: "Massenbilanz-Prüfer",
    description: "Prüft Mengenbilanzen auf Konformität mit FSC, PEFC, ISCC und SURE.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "befund" as AgentType,
    icon: FileSearch,
    title: "Befund-Formulierer",
    description: "Formuliert normenkonforme Audit-Befunde mit Schweregrad und Korrekturmaßnahmen.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    id: "bericht" as AgentType,
    icon: ClipboardList,
    title: "Audit-Bericht-Generator",
    description: "Erstellt einen professionellen Audit-Bericht aus den vorhandenen Daten.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: "berater" as AgentType,
    icon: Lightbulb,
    title: "Zertifizierungsberater",
    description: "Empfiehlt passende Zertifizierungsstandards basierend auf Branche und Produkte.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
] as const;

const STANDARDS = ["FSC", "PEFC", "ISCC", "SURE", "ISO 9001", "ISO 14001"];
const AUDIT_TYPEN = [
  { value: "initial", label: "Erstaudit" },
  { value: "surveillance", label: "Überwachungsaudit" },
  { value: "recertification", label: "Rezertifizierungsaudit" },
  { value: "six-month", label: "Halbjahresaudit" },
  { value: "internal", label: "Internes Audit" },
];

// ─── Result Components ─────────────────────────────────────────────────────────

const StatusBadge = ({
  status,
}: {
  status: "ausgeglichen" | "grenzwertig" | "abweichung" | "positiv" | "bedingt positiv" | "kritisch" | "ausstehend";
}) => {
  const map = {
    ausgeglichen: { variant: "default" as const, icon: CheckCircle2, label: "Ausgeglichen" },
    grenzwertig: { variant: "secondary" as const, icon: AlertTriangle, label: "Grenzwertig" },
    abweichung: { variant: "destructive" as const, icon: AlertTriangle, label: "Abweichung" },
    positiv: { variant: "default" as const, icon: CheckCircle2, label: "Positiv" },
    "bedingt positiv": { variant: "secondary" as const, icon: Info, label: "Bedingt positiv" },
    kritisch: { variant: "destructive" as const, icon: AlertTriangle, label: "Kritisch" },
    ausstehend: { variant: "outline" as const, icon: Info, label: "Ausstehend" },
  };
  const cfg = map[status] ?? { variant: "outline" as const, icon: Info, label: status };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1.5 text-sm px-3 py-1">
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </Badge>
  );
};

const SchweregradvBadge = ({ grad }: { grad: string }) => {
  const map: Record<string, string> = {
    Hauptabweichung: "destructive",
    Nebenabweichung: "secondary",
    Verbesserungshinweis: "outline",
    Beobachtung: "outline",
  };
  return <Badge variant={(map[grad] as "destructive" | "secondary" | "outline") ?? "outline"}>{grad}</Badge>;
};

const PrioritaetBadge = ({ p }: { p: string }) => {
  const map: Record<string, string> = {
    hoch: "destructive",
    mittel: "secondary",
    niedrig: "outline",
  };
  return <Badge variant={(map[p] as "destructive" | "secondary" | "outline") ?? "outline"}>{p}</Badge>;
};

function MassenbilanzResultView({ data }: { data: MassenbilanzResult }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={data.bilanzstatus} />
        <span className="text-2xl font-bold">{Number(data.verlustquote).toFixed(2)} %</span>
        <span className="text-sm text-muted-foreground">Verlustquote</span>
      </div>
      <p className="text-sm">{data.bewertung}</p>
      <div className="rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        <Info className="inline h-3.5 w-3.5 mr-1.5 align-text-top" />
        {data.toleranzInfo}
      </div>
      {data.empfehlungen.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Empfehlungen</p>
          <ul className="space-y-1.5">
            {data.empfehlungen.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BefundResultView({ data }: { data: BefundResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SchweregradvBadge grad={data.schweregrad} />
        <span className="text-sm text-muted-foreground">{data.normreferenz}</span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Befundtext</p>
        <p className="text-sm leading-relaxed">{data.befundtext}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Begründung</p>
        <p className="text-sm text-muted-foreground">{data.begruendung}</p>
      </div>
      {data.korrekturmassnahmen.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Korrekturmaßnahmen</p>
          <ul className="space-y-1.5">
            {data.korrekturmassnahmen.map((k, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 align-text-top" />
        Frist: {data.fristEmpfehlung}
      </div>
    </div>
  );
}

function BerichtResultView({ data }: { data: BerichtResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StatusBadge status={data.bewertung} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Zusammenfassung</p>
        <p className="text-sm">{data.zusammenfassung}</p>
      </div>
      <Separator />
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{data.bericht}</ReactMarkdown>
      </div>
    </div>
  );
}

function BeraterResultView({ data }: { data: BeraterResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {data.empfehlungen.map((e, i) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{e.zertifizierung}</CardTitle>
                <PrioritaetBadge p={e.prioritaet} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <p className="text-sm">{e.begruendung}</p>
              <p className="text-xs text-muted-foreground">{e.aufwandSchaetzung}</p>
              {e.voraussetzungen.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {e.voraussetzungen.map((v, j) => (
                    <li key={j} className="flex gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-md bg-muted/50 px-4 py-3 text-sm">
        <p className="font-medium mb-0.5">Fazit</p>
        <p className="text-muted-foreground">{data.fazit}</p>
      </div>
    </div>
  );
}

// ─── Forms ─────────────────────────────────────────────────────────────────────

function MassenbilanzForm({ onSubmit, loading }: { onSubmit: (inputs: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    zertifizierung: "",
    zeitraum: "",
    eingangsMenge: "",
    ausgangsMenge: "",
    lagerbestandsAenderung: "0",
    einheit: "t",
    notizen: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Standard *</Label>
          <Select onValueChange={set("zertifizierung")}>
            <SelectTrigger><SelectValue placeholder="Standard wählen" /></SelectTrigger>
            <SelectContent>
              {["FSC", "PEFC", "ISCC", "SURE"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Einheit</Label>
          <Select defaultValue="t" onValueChange={set("einheit")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["t", "kg", "m³", "l"].map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Zeitraum *</Label>
        <Input placeholder="z. B. Mai 2026 / Q2 2026" value={form.zeitraum} onChange={(e) => set("zeitraum")(e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Eingangsmenge *</Label>
          <Input type="number" placeholder="0" value={form.eingangsMenge} onChange={(e) => set("eingangsMenge")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Ausgangsmenge *</Label>
          <Input type="number" placeholder="0" value={form.ausgangsMenge} onChange={(e) => set("ausgangsMenge")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Lagerbestandsänd.</Label>
          <Input type="number" placeholder="0" value={form.lagerbestandsAenderung} onChange={(e) => set("lagerbestandsAenderung")(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Zusatzhinweise</Label>
        <Textarea rows={2} placeholder="Optional" value={form.notizen} onChange={(e) => set("notizen")(e.target.value)} />
      </div>

      <Button
        className="w-full"
        disabled={loading || !form.zertifizierung || !form.zeitraum || !form.eingangsMenge || !form.ausgangsMenge}
        onClick={() => onSubmit(form)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Massenbilanz prüfen
      </Button>
    </div>
  );
}

function BefundForm({ onSubmit, loading }: { onSubmit: (inputs: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    zertifizierung: "",
    auditTyp: "",
    normkapitel: "",
    beschreibung: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Standard *</Label>
          <Select onValueChange={set("zertifizierung")}>
            <SelectTrigger><SelectValue placeholder="Standard wählen" /></SelectTrigger>
            <SelectContent>
              {STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audit-Typ</Label>
          <Select onValueChange={set("auditTyp")}>
            <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
            <SelectContent>
              {AUDIT_TYPEN.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Normkapitel (optional)</Label>
        <Input placeholder="z. B. ISO 9001:2015 Kap. 8.4.1" value={form.normkapitel} onChange={(e) => set("normkapitel")(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Problembeschreibung *</Label>
        <Textarea
          rows={4}
          placeholder="Beschreiben Sie das festgestellte Problem oder die Abweichung..."
          value={form.beschreibung}
          onChange={(e) => set("beschreibung")(e.target.value)}
        />
      </div>

      <Button
        className="w-full"
        disabled={loading || !form.zertifizierung || !form.beschreibung}
        onClick={() => onSubmit(form)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Befund formulieren
      </Button>
    </div>
  );
}

function BerichtForm({ onSubmit, loading }: { onSubmit: (inputs: Record<string, string>) => void; loading: boolean }) {
  const { data: audits = [] } = useAudits();
  const [auditId, setAuditId] = useState("");
  const [berichtstyp, setBerichtstyp] = useState("kurz");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Audit auswählen *</Label>
        <Select onValueChange={setAuditId}>
          <SelectTrigger>
            <SelectValue placeholder="Audit wählen..." />
          </SelectTrigger>
          <SelectContent>
            {audits.map((a) => {
              const datum = a.scheduled_date
                ? new Date(a.scheduled_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })
                : "kein Datum";
              const typ = AUDIT_TYPE_LABELS[a.type] ?? a.type;
              return (
                <SelectItem key={a.id} value={a.id}>
                  {a.clients?.name} — {typ} ({datum})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Berichtstyp</Label>
        <Select defaultValue="kurz" onValueChange={setBerichtstyp}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kurz">Kurzfassung</SelectItem>
            <SelectItem value="vollstaendig">Vollbericht</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        disabled={loading || !auditId}
        onClick={() => onSubmit({ auditId, berichtstyp })}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Bericht generieren
      </Button>
    </div>
  );
}

function BeraterForm({ onSubmit, loading }: { onSubmit: (inputs: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    branche: "",
    produkte: "",
    marktregion: "",
    aktuelleZertifizierungen: "",
    unternehmensgroesse: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Branche *</Label>
          <Input placeholder="z. B. Holzverarbeitung" value={form.branche} onChange={(e) => set("branche")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Marktregion *</Label>
          <Input placeholder="z. B. DACH, EU, global" value={form.marktregion} onChange={(e) => set("marktregion")(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Produkte / Materialien *</Label>
        <Textarea rows={2} placeholder="z. B. Holzpaletten, Verpackungsmaterial aus Recyclingpapier" value={form.produkte} onChange={(e) => set("produkte")(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Unternehmensgröße</Label>
          <Select onValueChange={set("unternehmensgroesse")}>
            <SelectTrigger><SelectValue placeholder="Größe wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Kleinunternehmen (< 10 MA)">Klein (&lt; 10 MA)</SelectItem>
              <SelectItem value="KMU (10–250 MA)">KMU (10–250 MA)</SelectItem>
              <SelectItem value="Großunternehmen (> 250 MA)">Groß (&gt; 250 MA)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Bestehende Zertifizierungen</Label>
          <Input placeholder="z. B. ISO 9001" value={form.aktuelleZertifizierungen} onChange={(e) => set("aktuelleZertifizierungen")(e.target.value)} />
        </div>
      </div>

      <Button
        className="w-full"
        disabled={loading || !form.branche || !form.produkte || !form.marktregion}
        onClick={() => onSubmit(form)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Empfehlungen abrufen
      </Button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const Agents = () => {
  const [selected, setSelected] = useState<AgentType | null>(null);
  const { mutate, data: result, isPending, error, reset } = useRunAgent();

  const activeAgent = AGENTS.find((a) => a.id === selected);

  const handleSelect = (id: AgentType) => {
    if (selected !== id) {
      reset();
      setSelected(id);
    }
  };

  const handleSubmit = (inputs: Record<string, string>) => {
    if (!selected) return;
    mutate({ agentType: selected, inputs });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KI-Agenten</h1>
          <p className="text-sm text-muted-foreground">Spezialisierte Assistenten für Zertifizierungsaufgaben</p>
        </div>
      </div>

      {/* Agent Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isActive = selected === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 bg-card hover:border-border hover:bg-accent/40"
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg ${agent.bg} mb-2`}>
                <Icon className={`h-4 w-4 ${agent.color}`} />
              </div>
              <p className="text-sm font-medium leading-tight">{agent.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                {agent.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Agent Panel */}
      {activeAgent && (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Form */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${activeAgent.bg}`}>
                  <activeAgent.icon className={`h-4 w-4 ${activeAgent.color}`} />
                </div>
                <CardTitle className="text-base">{activeAgent.title}</CardTitle>
              </div>
              <CardDescription className="text-xs">{activeAgent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {selected === "massenbilanz" && <MassenbilanzForm onSubmit={handleSubmit} loading={isPending} />}
              {selected === "befund" && <BefundForm onSubmit={handleSubmit} loading={isPending} />}
              {selected === "bericht" && <BerichtForm onSubmit={handleSubmit} loading={isPending} />}
              {selected === "berater" && <BeraterForm onSubmit={handleSubmit} loading={isPending} />}
            </CardContent>
          </Card>

          {/* Result */}
          <Card className={`min-h-[200px] ${!result && !isPending && !error ? "border-dashed" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ergebnis</CardTitle>
                {result && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => reset()}>
                    <RotateCcw className="h-3 w-3" />
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isPending && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Agent arbeitet...</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Fehler</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                </div>
              )}

              {!isPending && !error && !result && (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <activeAgent.icon className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Formular ausfüllen und starten</p>
                </div>
              )}

              {result && !isPending && (
                <>
                  {selected === "massenbilanz" && <MassenbilanzResultView data={result as MassenbilanzResult} />}
                  {selected === "befund" && <BefundResultView data={result as BefundResult} />}
                  {selected === "bericht" && <BerichtResultView data={result as BerichtResult} />}
                  {selected === "berater" && <BeraterResultView data={result as BeraterResult} />}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Agents;
