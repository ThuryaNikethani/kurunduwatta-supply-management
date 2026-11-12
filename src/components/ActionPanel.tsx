"use client";

import { CheckCircle2, Forward, MessageSquare, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { errorText, useI18n } from "@/lib/i18n";
import type { Action, DocKind, Status } from "@/lib/types";
import { availableActions, noteRequired } from "@/lib/workflow";
import { Field } from "./common";

const ICON: Record<Action, typeof Send> = {
  submit: Send,
  resubmit: Send,
  forward_to_hr: Forward,
  return_to_chef: Undo2,
  reject_to_supervisor: Undo2,
  approve: CheckCircle2,
};

/**
 * Review buttons for the current user's role: one big "yes" button and a
 * "send back" button. Sending back asks for a reason; any other note is optional.
 */
export function ActionPanel({
  kind, id, title, status, children,
}: {
  kind: DocKind; id: string; title: string; status: Status; children?: React.ReactNode;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  /** The send-back action being written up, if any. */
  const [returning, setReturning] = useState<Action | null>(null);
  const [showNote, setShowNote] = useState(false);

  if (!profile) return null;
  const actions = availableActions(profile.role, status);
  if (!actions.length) return null;
  const forward = actions.filter((a) => !noteRequired(a));
  const back = actions.filter((a) => noteRequired(a));

  async function run(action: Action) {
    if (!profile) return;
    if (noteRequired(action) && !note.trim()) {
      setError("detail.reasonRequired");
      return;
    }
    setBusy(action);
    setError("");
    try {
      await performAction(kind, id, title, profile, action, note);
      setNote("");
      setReturning(null);
      setShowNote(false);
      toast.success(t(`did.${action}`));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const noteBox = (label: string) => (
    <Field label={label} htmlFor="note" error={error}>
      <Textarea id="note" rows={3} autoFocus placeholder={t("detail.notePh")} value={note} aria-invalid={!!error}
        onChange={(e) => { setNote(e.target.value); if (error) setError(""); }} />
    </Field>
  );

  return (
    <Card className="no-print border-amber/60 ring-2 ring-amber/30">
      <CardContent className="grid gap-3">
        <p className="font-display text-2xl font-semibold">{t("detail.yourTurn")}</p>
        {children}
        {returning ? (
          <>
            {noteBox(t("act.whyBack"))}
            <Button disabled={!!busy} onClick={() => run(returning)} variant="destructive" className="h-14 w-full text-lg">
              <Undo2 className="size-5" /> {busy ? t("saving") : t(`action.${returning}`)}
            </Button>
            <Button variant="ghost" className="h-11" onClick={() => { setReturning(null); setError(""); }}>{t("cancel")}</Button>
          </>
        ) : (
          <>
            {forward.map((a) => {
              const Icon = ICON[a];
              return (
                <Button key={a} disabled={!!busy} onClick={() => run(a)} variant="accent" className="h-14 w-full text-lg">
                  <Icon className="size-5" /> {busy === a ? t("saving") : t(`action.${a}`)}
                </Button>
              );
            })}
            {back.map((a) => (
              <Button key={a} disabled={!!busy} variant="outline" onClick={() => setReturning(a)}
                className="h-12 w-full border-destructive/40 text-base text-destructive hover:bg-destructive/5 hover:text-destructive">
                <Undo2 /> {t(`action.${a}`)}
              </Button>
            ))}
            {forward.length > 0 && (showNote ? noteBox(t("act.note")) : (
              <Button variant="ghost" className="justify-start px-0 text-muted-foreground" onClick={() => setShowNote(true)}>
                <MessageSquare /> {t("act.addNote")}
              </Button>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
