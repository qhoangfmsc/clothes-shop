import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";

/* The script tag that carries structured data (specs/platform/seo.md, flows SEO-6 and SEO-6E). */

const script = (container: HTMLElement) => container.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;

describe("SEO-6 JsonLd", () => {
  it("embeds an object as JSON that can be parsed back", () => {
    const data = { "@context": "https://schema.org", "@type": "Product", name: "Dress" };

    const { container } = render(<JsonLd data={data} />);

    expect(JSON.parse(script(container).innerHTML)).toEqual(data);
  });

  it("embeds a list of objects", () => {
    const { container } = render(<JsonLd data={[{ a: 1 }, { b: 2 }]} />);

    expect(JSON.parse(script(container).innerHTML)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("renders exactly one script tag of the structured-data type", () => {
    const { container } = render(<JsonLd data={{}} />);

    expect(container.querySelectorAll("script")).toHaveLength(1);
  });
});

describe("SEO-6E data that tries to break out of the script", () => {
  it("escapes every < so a closing tag inside a name cannot end the script", () => {
    const { container } = render(<JsonLd data={{ name: "</script><img src=x onerror=alert(1)>" }} />);

    const html = script(container).innerHTML;
    expect(html).not.toContain("<");
    expect(html).toContain("\\u003c/script>");
    expect(JSON.parse(html).name).toBe("</script><img src=x onerror=alert(1)>");
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
