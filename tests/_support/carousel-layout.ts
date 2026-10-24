/* jsdom measures nothing, but the Carousel decides its pages from the size and position of its slides. This gives every element the box a
   real browser would: slides sit in a row (`slideWidth` wide, `gap` apart) inside a track `trackWidth` wide. Call it in a test and the
   returned function puts jsdom back. */

interface CarouselBox {
  trackWidth: number;
  slideWidth: number;
  gap: number;
}

const isSlide = (el: Element) => el.getAttribute("aria-roledescription") === "slide";
const isTrack = (el: Element) => el.children.length > 0 && isSlide(el.children[0]);

export function carouselLayout({ trackWidth, slideWidth, gap }: CarouselBox) {
  const proto = HTMLElement.prototype;
  const originals = ["offsetLeft", "offsetWidth", "clientWidth", "scrollWidth"].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)] as const);
  const define = (name: string, get: (el: HTMLElement) => number) => Object.defineProperty(proto, name, { configurable: true, get() { return get(this as HTMLElement); } });

  define("offsetLeft", (el) => (isSlide(el) ? Array.from(el.parentElement!.children).indexOf(el) * (slideWidth + gap) : 0));
  define("offsetWidth", (el) => (isSlide(el) ? slideWidth : 0));
  define("clientWidth", (el) => (isTrack(el) ? trackWidth : 0));
  define("scrollWidth", (el) => (isTrack(el) ? el.children.length * slideWidth + (el.children.length - 1) * gap : 0));

  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else delete (proto as unknown as Record<string, unknown>)[name];
    }
  };
}
