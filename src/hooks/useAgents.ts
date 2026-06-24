import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AGENTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agents`;

export type AgentType = "massenbilanz" | "befund" | "bericht" | "berater";

export interface AgentRequest {
  agentType: AgentType;
  inputs: Record<string, string>;
}

// ─── Result shapes ─────────────────────────────────────────────────────────────

export interface MassenbilanzResult {
  bilanzstatus: "ausgeglichen" | "grenzwertig" | "abweichung";
  verlustquote: number;
  bewertung: string;
  empfehlungen: string[];
  toleranzInfo: string;
  konform: boolean;
}

export interface BefundResult {
  schweregrad: "Hauptabweichung" | "Nebenabweichung" | "Verbesserungshinweis" | "Beobachtung";
  befundtext: string;
  normreferenz: string;
  korrekturmassnahmen: string[];
  fristEmpfehlung: string;
  begruendung: string;
}

export interface BerichtResult {
  titel: string;
  zusammenfassung: string;
  bewertung: "positiv" | "bedingt positiv" | "kritisch" | "ausstehend";
  bericht: string;
}

export interface BeraterEmpfehlung {
  zertifizierung: string;
  prioritaet: "hoch" | "mittel" | "niedrig";
  begruendung: string;
  aufwandSchaetzung: string;
  voraussetzungen: string[];
}

export interface BeraterResult {
  empfehlungen: BeraterEmpfehlung[];
  fazit: string;
}

export type AgentResult = MassenbilanzResult | BefundResult | BerichtResult | BeraterResult;

export const useRunAgent = () => {
  return useMutation({
    mutationFn: async ({ agentType, inputs }: AgentRequest): Promise<AgentResult> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nicht angemeldet.");

      const resp = await fetch(AGENTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ agentType, inputs }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        throw new Error(json.error ?? `Fehler ${resp.status}`);
      }

      return json.data as AgentResult;
    },
  });
};
