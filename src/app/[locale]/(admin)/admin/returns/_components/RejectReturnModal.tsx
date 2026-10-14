"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import {
  ModalShell,
  ModalBody,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { rejectReturn } from "../_common/moduleSlice";
import { RETURN_NOTE_MAX } from "../_common/constants";
import type { ReturnRequest } from "../_common/types";

interface RejectReturnModalProps {
  request: ReturnRequest;
  onClose: () => void;
  onDone: (request: ReturnRequest) => void;
}

/** Declines the return before the parcel arrives. The reason is required and the customer reads it. */
export default function RejectReturnModal({ request, onClose, onDone }: RejectReturnModalProps) {
  const t = useTranslations("admin.returns.reject");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.returns.isUpdating);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError(t("errors.note"));
      return;
    }
    setError(null);
    try {
      const updated = await dispatch(rejectReturn({ returnId: request.id, note: note.trim() })).unwrap();
      toast.success(t("toast.done", { id: request.id }));
      onDone(updated);
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.failed")));
    }
  };

  return (
    <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          <p className="m-0 text-sm font-primary text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            {t("warning")}
          </p>
          <FormSection>
            <FormField label={t("note.label")} required info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={4}
                value={note}
                maxLength={RETURN_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <span className="text-xs text-[var(--accent-rose)] font-primary">{error}</span>}
            </FormField>
          </FormSection>
        </ModalBody>
        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
