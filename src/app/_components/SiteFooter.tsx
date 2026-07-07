import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">Ori Baebi</span>
        <span className="site-footer__copy">© 2026 All rights reserved.</span>
        <Link href="/about" className="site-footer__link">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
