"use client";

import { useCallback } from "react";
import { Link2, Share2 } from "lucide-react";
import { useToast } from "@/src/app/_components/Toast";

interface ShareButtonsProps {
  productName: string;
  productUrl: string;
}

export default function ShareButtons({ productName, productUrl }: ShareButtonsProps) {
  const { toast } = useToast();
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${productUrl}` : productUrl;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [fullUrl, toast]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} from Ori Baebi`,
          url: fullUrl,
        });
      } catch {
        /* User cancelled — do nothing */
      }
    }
  }, [productName, fullUrl]);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${productName} from Ori Baebi`)}&url=${encodeURIComponent(fullUrl)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(fullUrl)}&description=${encodeURIComponent(productName)}`,
  };

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="pdp-share">
      <span className="pdp-share__label">Share</span>
      <div className="pdp-share__buttons">
        {/* Copy link */}
        <button type="button" className="pdp-share__btn" onClick={handleCopyLink} aria-label="Copy link">
          <Link2 size={16} />
        </button>

        {/* Native share (mobile) */}
        {supportsNativeShare && (
          <button type="button" className="pdp-share__btn" onClick={handleNativeShare} aria-label="Share">
            <Share2 size={16} />
          </button>
        )}

        {/* Twitter/X */}
        {!supportsNativeShare && (
          <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="pdp-share__btn" aria-label="Share on X">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        )}

        {/* Pinterest */}
        {!supportsNativeShare && (
          <a href={shareLinks.pinterest} target="_blank" rel="noopener noreferrer" className="pdp-share__btn" aria-label="Share on Pinterest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
