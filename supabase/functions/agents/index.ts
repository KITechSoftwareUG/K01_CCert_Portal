import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

type AgentType = "massenbilanz" | "befund" | "bericht" | "berater";

const callOpenAI = async (apiKey: string, system: string, user: string) => {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    const status = res.status;
    if (status === 429) throw new Error("rate_limit");
    if (status === 402) throw new Error("quota_exceeded");
    throw new Error(`OpenAI ${status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
};

// ─── Massenbilanz ─────────────────────────────────────────────────────────────

const MASSENBILANZ_SYSTEM = `
Du bist Experte für Zertifizierungsstandards FSC, PEFC, ISCC und SURE.
Prüfe die Massenbilanz und antworte mit einem JSON-Objekt — kein anderer Text.

JSON-Struktur (exakt):
{
  "bilanzstatus": "ausgeglichen" | "grenzwertig" | "abweichung",
  "verlustquote": <Zahl in Prozent, 2 Dezimalstellen>,
  "bewertung": "<fachliche Bewertung, 1-2 Sätze>",
  "empfehlungen": ["<Empfehlung 1>", "<Empfehlung 2>"],
  "toleranzInfo": "<Toleranzbereich des gewählten Standards>",
  "konform": true | false
}

Toleranzrahmen (Richtwerte):
- FSC Chain of Custody: max. 5% Verlust je Umwandlungsstufe
- PEFC Chain of Custody: max. 5% Verlust
- ISCC: Buchführungspflichtig, Verluste zu dokumentieren, i.d.R. < 1-2%
- SURE: Wie ISCC, Nachweis vollständiger Mengenstrom erforderlich

Verlustquote = (Eingang − Ausgang + LagerAbnahme) / Eingang × 100
Wenn Lagerbestand zunimmt → Wert ist positiv → erhöht effektiven Output.
`.trim();

const runMassenbilanz = async (apiKey: string, inputs: Record<string, string>) => {
  const {
    zertifizierung,
    zeitraum,
    eingangsMenge,
    ausgangsMenge,
    lagerbestandsAenderung = "0",
    einheit = "t",
    notizen = "",
  } = inputs;

  const eingang = parseFloat(eingangsMenge);
  const ausgang = parseFloat(ausgangsMenge);
  const lager = parseFloat(lagerbestandsAenderung);
  const verlust = eingang > 0 ? ((eingang - ausgang - lager) / eingang) * 100 : 0;

  const user = `
Standard: ${zertifizierung}
Zeitraum: ${zeitraum}
Eingang: ${eingangsMenge} ${einheit}
Ausgang: ${ausgangsMenge} ${einheit}
Lagerbestandsänderung: ${lager > 0 ? "+" : ""}${lagerbestandsAenderung} ${einheit} (positiv = Zunahme)
Berechnete Verlustquote: ${verlust.toFixed(2)}%
${notizen ? `Zusatzhinweise: ${notizen}` : ""}
`.trim();

  return callOpenAI(apiKey, MASSENBILANZ_SYSTEM, user);
};

// ─── Befund ───────────────────────────────────────────────────────────────────

const BEFUND_SYSTEM = `
Du bist erfahrener Auditor für Managementsysteme (ISO 9001, ISO 14001, FSC, PEFC, ISCC, SURE).
Formuliere aus der Beschreibung einen normenkonformen Audit-Befund als JSON — kein anderer Text.

JSON-Struktur (exakt):
{
  "schweregrad": "Hauptabweichung" | "Nebenabweichung" | "Verbesserungshinweis" | "Beobachtung",
  "befundtext": "<formal formulierter Befundtext, 3-5 Sätze, objektiv und nachvollziehbar>",
  "normreferenz": "<Normkapitel, z.B. ISO 9001:2015 Kap. 8.4.1 oder FSC-STD-40-004 Kap. 5.2>",
  "korrekturmassnahmen": ["<Korrekturmaßnahme 1>", "<Korrekturmaßnahme 2>", "<Korrekturmaßnahme 3>"],
  "fristEmpfehlung": "<z.B. Sofortmaßnahme innerhalb 30 Tage / bis zum Folgeaudit>",
  "begruendung": "<kurze Begründung der Schweregradeinstufung>"
}

Schweregrad-Kriterien:
- Hauptabweichung: Systemisches Versagen oder kritische Anforderung nicht erfüllt
- Nebenabweichung: Einzelfall, Anforderung teilweise nicht erfüllt, kein Systemversagen
- Verbesserungshinweis: Erfüllung gegeben, aber Potenzial zur Optimierung
- Beobachtung: Hinweis ohne direkte Abweichung, sollte überwacht werden
`.trim();

const runBefund = async (apiKey: string, inputs: Record<string, string>) => {
  const { beschreibung, normkapitel = "", zertifizierung, auditTyp = "" } = inputs;

  const user = `
Standard/Zertifizierung: ${zertifizierung}
${auditTyp ? `Audittyp: ${auditTyp}` : ""}
${normkapitel ? `Hinweis Normkapitel: ${normkapitel}` : ""}
Problembeschreibung: ${beschreibung}
`.trim();

  return callOpenAI(apiKey, BEFUND_SYSTEM, user);
};

// ─── Bericht ──────────────────────────────────────────────────────────────────

const BERICHT_SYSTEM = `
Du bist professioneller Zertifizierungsberater und erstellst Audit-Berichte.
Erstelle einen Audit-Bericht als JSON — kein anderer Text.

JSON-Struktur (exakt):
{
  "titel": "<Audittitel, z.B. ISO 9001 Überwachungsaudit — Mustermann GmbH>",
  "zusammenfassung": "<Executive Summary, 2-3 Sätze>",
  "bewertung": "positiv" | "bedingt positiv" | "kritisch" | "ausstehend",
  "bericht": "<vollständiger Bericht in Markdown mit Abschnitten: ## Übersicht, ## Durchführung, ## Ergebnisse, ## Offene Punkte, ## Empfehlungen>"
}

Schreibe professionell, sachlich und auf Deutsch.
`.trim();

const runBericht = async (
  apiKey: string,
  inputs: Record<string, string>,
  supabase: ReturnType<typeof createClient>,
) => {
  const { auditId, berichtstyp = "kurz" } = inputs;

  // Audit-Daten aus DB laden
  const { data: audit, error } = await supabase
    .from("audits")
    .select(`
      id, type, status, scheduled_date, notes,
      clients (id, name, country),
      client_certifications (
        id, valid_from, valid_until, certificate_number, scope,
        certifications (name)
      ),
      auditors (id, name),
      certification_bodies (id, name),
      audit_tasks (id, title, description, status, due_date, assigned_to)
    `)
    .eq("id", auditId)
    .single();

  if (error || !audit) throw new Error("Audit nicht gefunden.");

  const tasks = (audit.audit_tasks as { title: string; status: string; due_date: string | null }[]) ?? [];
  const offene = tasks.filter((t) => t.status !== "completed").length;
  const erledigt = tasks.filter((t) => t.status === "completed").length;

  const user = `
Bitte erstelle einen ${berichtstyp === "vollstaendig" ? "vollständigen" : "kompakten"} Audit-Bericht.

Audit-Daten:
- Typ: ${audit.type}
- Status: ${audit.status}
- Datum: ${audit.scheduled_date ? new Date(audit.scheduled_date).toLocaleDateString("de-DE") : "nicht gesetzt"}
- Kunde: ${(audit.clients as { name: string } | null)?.name ?? "unbekannt"}
- Zertifizierung: ${(audit.client_certifications as { certifications: { name: string } | null } | null)?.certifications?.name ?? "nicht verknüpft"}
- Auditor: ${(audit.auditors as { name: string } | null)?.name ?? "nicht zugewiesen"}
- Zertifizierungsstelle: ${(audit.certification_bodies as { name: string } | null)?.name ?? "nicht gesetzt"}

Aufgaben (${tasks.length} gesamt):
- Erledigt: ${erledigt}
- Offen: ${offene}

${tasks.length > 0 ? `Aufgabenliste:\n${tasks.map((t) => `- [${t.status}] ${t.title}`).join("\n")}` : ""}

${audit.notes ? `Audit-Notizen: ${audit.notes}` : ""}
`.trim();

  return callOpenAI(apiKey, BERICHT_SYSTEM, user);
};

// ─── Berater ──────────────────────────────────────────────────────────────────

const BERATER_SYSTEM = `
Du bist Experte für internationale Zertifizierungsstandards.
Empfehle passende Zertifizierungen als JSON — kein anderer Text.

JSON-Struktur (exakt):
{
  "empfehlungen": [
    {
      "zertifizierung": "<Standardname>",
      "prioritaet": "hoch" | "mittel" | "niedrig",
      "begruendung": "<warum passend, 1-2 Sätze>",
      "aufwandSchaetzung": "<z.B. 6-12 Monate Vorbereitung, externer Auditor erforderlich>",
      "voraussetzungen": ["<Voraussetzung 1>", "<Voraussetzung 2>"]
    }
  ],
  "fazit": "<Gesamtempfehlung 2-3 Sätze>"
}

Verfügbare Standards im System: FSC, PEFC, ISCC, SURE, ISO 9001, ISO 14001
Empfehle maximal 4 Standards. Nur empfehlen was zum Unternehmen passt.
`.trim();

const runBerater = async (apiKey: string, inputs: Record<string, string>) => {
  const {
    branche,
    produkte,
    marktregion,
    aktuelleZertifizierungen = "",
    unternehmensgroesse = "",
  } = inputs;

  const user = `
Branche: ${branche}
Produkte/Materialien: ${produkte}
Marktregion: ${marktregion}
${unternehmensgroesse ? `Unternehmensgröße: ${unternehmensgroesse}` : ""}
${aktuelleZertifizierungen ? `Bestehende Zertifizierungen: ${aktuelleZertifizierungen}` : "Noch keine Zertifizierungen vorhanden."}
`.trim();

  return callOpenAI(apiKey, BERATER_SYSTEM, user);
};

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": CORS_HEADERS,
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ALLOWED_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "").trim();
    if (ALLOWED_ORIGIN) corsHeaders["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY nicht konfiguriert");

    const jwt = authHeader.replace("Bearer ", "");
    const authSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await authSupabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Ungültiger Token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const agentType = body.agentType as AgentType;
    const inputs = body.inputs as Record<string, string>;

    if (!agentType || !inputs) {
      return new Response(JSON.stringify({ error: "agentType und inputs erforderlich." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let result: Record<string, unknown>;

    if (agentType === "massenbilanz") {
      result = await runMassenbilanz(OPENAI_API_KEY, inputs);
    } else if (agentType === "befund") {
      result = await runBefund(OPENAI_API_KEY, inputs);
    } else if (agentType === "bericht") {
      result = await runBericht(OPENAI_API_KEY, inputs, supabase);
    } else if (agentType === "berater") {
      result = await runBerater(OPENAI_API_KEY, inputs);
    } else {
      return new Response(JSON.stringify({ error: `Unbekannter agentType: ${agentType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("agents FATAL:", msg);

    if (msg === "rate_limit") {
      return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte einen Moment warten." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg === "quota_exceeded") {
      return new Response(JSON.stringify({ error: "KI-Kontingent erschöpft." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
