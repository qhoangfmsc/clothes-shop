import Link from "next/link";
import { CATEGORIES } from "../_data/shop-data";

export default function ShopFooter() {
  return (
    <footer>
      <div className="shop-footer">
        {/* Brand column */}
        <div className="shop-footer__brand">
          <span className="shop-footer__brand-name">Ori Baebi</span>
          <span className="shop-footer__tagline">
            Crafted with intention — luxury essentials for the modern wardrobe.
          </span>
        </div>

        {/* Link columns */}
        <div className="shop-footer__links">
          <div className="shop-footer__col">
            <span className="shop-footer__col-title">Shop</span>
            {CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/shop/${cat.slug}`}>
                {cat.title}
              </Link>
            ))}
            <Link href="/new-in">New In</Link>
          </div>

          <div className="shop-footer__col">
            <span className="shop-footer__col-title">Brand</span>
            <Link href="/about">About</Link>
            <Link href="/collections">Collections</Link>
            <Link href="#">Contact</Link>
          </div>

          <div className="shop-footer__col">
            <span className="shop-footer__col-title">Follow</span>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              Pinterest
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shop-footer__bottom">
        <span className="shop-footer__copyright">© 2026 Ori Baebi. All rights reserved.</span>
        <span className="shop-footer__copyright">Privacy Policy</span>
      </div>
    </footer>
  );
}
