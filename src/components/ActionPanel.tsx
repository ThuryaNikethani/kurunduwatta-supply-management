"use client";

import { useState } from "react";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Action, DocKind, Status } from "@/lib/types";
import { availableActions, noteRequired } from "@/lib/workflow";
import { useToast } from "./Toast";

/**
 * Review buttons for the current user's role. Sending back requires a reason;
 * the chef can resend with a note explaining their quantities.
 */
export function ActionPanel({
  kind, id, title, status, children,
}: {
  kind: DocKind; id: string; title: string; status: Status; children?: React.ReactNode;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");

  if (!profile) return null;
  const actions = availableActions(profile.role, status);
  if (!actions.length) return null;

  async function run(action: Action) {
    if (!profile) return;
    if (noteRequired(action) && !note.trim()) {
      setError(t("detail.reasonRequired"));
      return;
    }
    setBusy(action);
    setError("");
    try {
      await performAction(kind, id, title, profile, action, note);
      setNote("");
      toast({ text: t(`action.${action}`) + " ✓", tone: "success" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print card border-amber ring-1 ring-amber/40">
      <h2 className="h2 mb-3">{t("detail.yourTurn")}</h2>
      {children}
      <label className="label" htmlFor="note">{t("detail.reason")}</label>
      <textarea
        id="note"
        rows={3}
        className="input"
        placeholder={t("detail.notePh")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            disabled={!!busy}
            onClick={() => run(a)}
            className={noteRequired(a) ? "btn-danger" : a === "approve" ? "btn-dark" : "btn-primary"}
          >
            {busy === a ? t("saving") : t(`action.${a}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
