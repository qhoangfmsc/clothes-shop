import { SOCIALS } from "@/src/lib/socials";

interface SocialIconsProps {
  /** Classes for each icon link — each surface (footer, burger menu) styles its own */
  linkClassName: string;
  iconSize?: number;
  className?: string;
}

/** Icon-only social links, driven by `src/lib/socials.tsx`. */
export default function SocialIcons({
  linkClassName,
  iconSize = 18,
  className = "",
}: SocialIconsProps) {
  return (
    <ul className={`m-0 flex list-none items-center p-0 ${className}`}>
      {SOCIALS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={linkClassName}
          >
            <Icon size={iconSize} />
          </a>
        </li>
      ))}
    </ul>
  );
}
