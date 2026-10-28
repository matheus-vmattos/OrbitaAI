import { ObligationSession } from "@orbita/shared/session";
import type { BatchConsumer } from "./types";

/** Reutiliza a mesma sessão para importação e eventos. Sem rede, IA ou autenticação. */
export function sessionConsumer(
  session: ObligationSession,
  self: string,
): BatchConsumer {
  return (messages) => {
    session.ingest(messages, { self });
  };
}
