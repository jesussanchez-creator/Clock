import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDate } from "@/lib/time";
import {
  computeCurrentState,
  type ClockState,
  type TimeEvent,
} from "@/lib/validations/clock";

export interface SessionState {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  events: TimeEvent[];
  state: ClockState;
  localDate: string;
}

/**
 * Obtiene el usuario autenticado desde la sesión de Supabase y sus eventos del
 * día en curso (Europe/Madrid).
 */
export async function getSessionState(): Promise<SessionState> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const localDate = getLocalDate();

  if (!user || !user.email) {
    return {
      user: null,
      events: [],
      state: "NOT_STARTED",
      localDate,
    };
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  // Las RLS garantizan que sólo se devuelven los eventos de este usuario.
  const { data, error } = await supabase
    .from("time_events")
    .select("*")
    .eq("local_date", localDate)
    .order("event_timestamp", { ascending: true });

  if (error) {
    console.error("[getSessionState] error fetching events:", error.message);
    return {
      user: { id: user.id, email: user.email, fullName },
      events: [],
      state: "NOT_STARTED",
      localDate,
    };
  }

  const events = (data ?? []) as TimeEvent[];
  const state = computeCurrentState(events);

  return {
    user: { id: user.id, email: user.email, fullName },
    events,
    state,
    localDate,
  };
}
