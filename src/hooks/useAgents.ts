import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AGENTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agents`;

export type AgentType = "einlagerung";

export interface AgentRequest {
  agentType: AgentType;
  inputs: Record<string, string>;
}

export interface EinlagerungLieferant {
  name: string;
  tonnen: number;
  srm: number;
  lieferungen: number;
}

export interface EinlagerungPeriode {
  monat: string;
  tonnen: number;
  srm: number;
  lieferungen: number;
}

export interface EinlagerungResult {
  zeitraum: string;
  gesamtLieferungen: number;
  gesamtTonnen: number;
  gesamtSrm: number;
  topLieferanten: EinlagerungLieferant[];
  topSorten: { name: string; tonnen: number }[];
  massenbilanz: EinlagerungPeriode[];
  antwort?: string;
  auffaelligkeiten?: string[];
}

export type AgentResult = EinlagerungResult;

export const useRunAgent = () => {
  return useMutation({
    mutationFn: async ({ agentType, inputs }: AgentRequest): Promise<AgentResult> => {
      const { data: { session } } = await supabase.auth.getSession();
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
      if (!resp.ok) throw new Error(json.error ?? `Fehler ${resp.status}`);
      return json.data as AgentResult;
    },
  });
};