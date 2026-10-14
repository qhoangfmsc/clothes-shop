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
import { approveReturn } from "../_common/moduleSlice";
import { RETURN_NOTE_MAX } from "../_common/constants";
import type { ReturnRequest } from "../_common/types";

interface ApproveReturnModalProps {
  request: ReturnRequest;
  onClose: () => void;
  /** Gets the updated request */
  onDone: (request: ReturnRequest) => void;
}

/** Lets the customer send the parcel back. The optional note is the shipping instructions the customer sees. */
export default function ApproveReturnModal({ request, onClose, onDone }: ApproveReturnModalProps) {
  const t = useTranslations("admin.returns.approve");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.returns.isUpdating);
  const [note, setNote] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await dispatch(approveReturn({ returnId: request.id, note: note.trim() || undefined })).unwrap();
      toast.success(t("toast.done", { id: request.id }));
      onDone(updated);
    } catch (err) {
      /* 1804: another admin or the customer changed the request meanwhile */
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
            <FormField label={t("note.label")} info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={4}
                value={note}
                maxLength={RETURN_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormField>
          </FormSection>
        </ModalBody>
        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
