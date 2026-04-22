-- Hilfsfunktion für den KI-Assistenten: führt beliebige SELECT-Abfragen aus.
-- Wird nur vom Service Role Key aufgerufen (aus der Edge Function).
CREATE OR REPLACE FUNCTION chat_execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT (lower(trim(query)) ~ '^select') THEN
    RAISE EXCEPTION 'Nur SELECT-Abfragen erlaubt';
  END IF;
  EXECUTE format('SELECT json_agg(row_to_json(r)) FROM (%s) r', query) INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
