CREATE TABLE public.tactical_ai_access_state (
 id text PRIMARY KEY,
 status integer NOT NULL,
 message text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tactical_ai_access_state TO service_role;
ALTER TABLE public.tactical_ai_access_state ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.tactical_ai_access_state IS 'Server-only durable AI access-denial state. No player statistics stored.';