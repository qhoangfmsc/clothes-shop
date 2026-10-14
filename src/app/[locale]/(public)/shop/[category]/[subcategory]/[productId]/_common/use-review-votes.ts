"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { ApiError } from "@/src/lib/api";
import { buildListQuery, LIST_MAX_LIMIT } from "@/src/lib/list-query";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import type { AuthorReview } from "@/src/types/review";

/** BE codes this hook answers itself */
const CODE_REVIEW_NOT_FOUND = 1901;
const CODE_VOTE_OWN = 1907;

interface VoteResult {
  data: { reviewId: string; helpfulCount: number; voted: boolean };
}

/**
 * "Helpful" state of the signed-in visitor on one product page:
 *  - which reviews they already marked (`GET /api/my-reviews/votes`),
 *  - their own reviews of this product (`GET /api/my-reviews?productId=`): the BE refuses a vote on those, and the
 *    page offers "Edit your review" for the one that can still be edited (fetched `raw` so an edit sends the BE's photo URLs back),
 *  - the counts the BE returned after each vote (the list's own counts are older).
 * Visitors without a session or without the review permission simply get empty sets: the button still works for them
 * after signing in, and a permission error on the lookups is not shown.
 */
export function useReviewVotes(productId: string, onReviewGone: () => void) {
  const t = useTranslations("public.product.reviews");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useApiAuth();
  const { requireAuth } = useAuthAction();

  const [votedIds, setVotedIds] = useState<ReadonlySet<string>>(new Set());
  const [ownReviews, setOwnReviews] = useState<AuthorReview[]>([]);
  /** Ids the BE refused a vote on (`1907`) even though the own-review lookup did not list them */
  const [refusedIds, setRefusedIds] = useState<ReadonlySet<string>>(new Set());
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>({});
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const loadOwn = useCallback(async () => {
    const ownQuery = buildListQuery({ limit: LIST_MAX_LIMIT }, { productId });
    try {
      const res = await apiFetch<{ data: AuthorReview[] }>(`/api/my-reviews?${ownQuery}`, { raw: true });
      setOwnReviews(res.data);
    } catch {
      /* no permission or offline: the page just does not know which reviews are the visitor's own */
      setOwnReviews([]);
    }
  }, [apiFetch, productId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setVotedIds(new Set());
      setOwnReviews([]);
      return;
    }
    let cancelled = false;
    apiFetch<{ data: string[] }>(`/api/my-reviews/votes?productId=${encodeURIComponent(productId)}`)
      .then((res) => !cancelled && setVotedIds(new Set(res.data)))
      .catch(() => !cancelled && setVotedIds(new Set()));
    void loadOwn();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId, apiFetch, loadOwn]);

  const ownIds = useMemo(
    () => new Set([...ownReviews.map((review) => review.id), ...refusedIds]),
    [ownReviews, refusedIds]
  );

  const toggle = useCallback(
    (reviewId: string) => {
      requireAuth(async () => {
        setBusyIds((prev) => new Set(prev).add(reviewId));
        const wasVoted = votedIds.has(reviewId);
        try {
          const res = await apiFetch<VoteResult>(`/api/reviews/${encodeURIComponent(reviewId)}/helpful`, {
            method: wasVoted ? "DELETE" : "POST",
          });
          setCounts((prev) => ({ ...prev, [reviewId]: res.data.helpfulCount }));
          setVotedIds((prev) => {
            const next = new Set(prev);
            if (res.data.voted) next.add(reviewId);
            else next.delete(reviewId);
            return next;
          });
        } catch (err) {
          const code = err instanceof ApiError ? err.errorCode : undefined;
          if (code === CODE_VOTE_OWN) {
            /* The button should not have been offered: remember it and tell the visitor gently */
            setRefusedIds((prev) => new Set(prev).add(reviewId));
            toast.info(toErrorMessage(err, t("toast.voteOwn")));
          } else {
            if (code === CODE_REVIEW_NOT_FOUND) onReviewGone();
            toast.error(toErrorMessage(err, t("toast.voteFailed")));
          }
        } finally {
          setBusyIds((prev) => {
            const next = new Set(prev);
            next.delete(reviewId);
            return next;
          });
        }
      }, "continue");
    },
    [requireAuth, votedIds, apiFetch, onReviewGone, toast, toErrorMessage, t]
  );

  return { votedIds, ownIds, ownReviews, reloadOwn: loadOwn, counts, busyIds, toggle };
}
