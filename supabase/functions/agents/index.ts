import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

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

// ─── Einlagerung ──────────────────────────────────────────────────────────────

const EINLAGERUNG_SYSTEM = `
Du bist Auswertungsassistent für Holzhackschnitzel-Betriebstagebücher.
Du erhältst normalisierte Lieferdaten (JSON-Array) und beantwortest Fragen dazu.
Antworte ausschließlich mit einem JSON-Objekt — kein anderer Text.

JSON-Struktur (exakt):
{
  "zeitraum": "<z.B. Januar 2026 – Mai 2026>",
  "gesamtLieferungen": <Anzahl als Integer>,
  "gesamtTonnen": <Summe t/lutro, 2 Dezimalstellen>,
  "gesamtSrm": <Summe SRM, 2 Dezimalstellen>,
  "topLieferanten": [
    { "name": "<Lieferant>", "tonnen": <Zahl>, "srm": <Zahl>, "lieferungen": <Integer> }
  ],
  "topSorten": [
    { "name": "<Sorte>", "tonnen": <Zahl> }
  ],
  "massenbilanz": [
    { "monat": "<YYYY-MM>", "tonnen": <Zahl>, "srm": <Zahl>, "lieferungen": <Integer> }
  ],
  "antwort": "<Antwort auf die spezifische Frage — leer lassen wenn keine Frage gestellt>",
  "auffaelligkeiten": ["<Auffälligkeit 1>", "<Auffälligkeit 2>"]
}

Regeln:
- topLieferanten: max. 5, sortiert nach Tonnen absteigend
- topSorten: max. 5, sortiert nach Tonnen absteigend
- massenbilanz: alle Monate chronologisch
- Fehlende Werte (null) nicht in Summen einrechnen
- auffaelligkeiten: max. 3, nur wenn wirklich auffällig (Lücken, Ausreißer, fehlende Daten)
`.trim();

const runEinlagerung = async (apiKey: string, inputs: Record<string, string>) => {
  const { lieferungen, frage = "" } = inputs;

  let rows: unknown[];
  try {
    rows = JSON.parse(lieferungen);
  } catch {
    throw new Error("Ungültige Lieferdaten.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Keine Lieferdaten vorhanden.");
  }

  const user = `
Lieferdaten (${rows.length} Einträge):
${JSON.stringify(rows)}

${frage ? `Spezifische Frage: ${frage}` : "Erstelle eine vollständige Auswertung."}
`.trim();

  return callOpenAI(apiKey, EINLAGERUNG_SYSTEM, user);
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
    const {
      data: { user },
      error: authErr,
    } = await authSupabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Ungültiger Token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { agentType, inputs } = body as { agentType: string; inputs: Record<string, string> };

    if (agentType !== "einlagerung" || !inputs) {
      return new Response(JSON.stringify({ error: "Unbekannter agentType." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await runEinlagerung(OPENAI_API_KEY, inputs);

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
