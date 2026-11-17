/* jsdom has no layout, `ResizeObserver`, `IntersectionObserver` or `Element.scrollTo`. These stand-ins let a test play the browser:
   `observers.intersection[0].trigger(true)` says the element came into view (`triggerFor(true, [card])` names the elements), `observers.resize[0].trigger()` says its box changed, and
   `scrolls` lists the `scrollTo` calls (which also move `scrollLeft` and fire `scroll`). `setup.ts` installs them and resets them after each test. */

type ResizeCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
type IntersectionCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

class FakeResizeObserver {
  disconnected = false;
  observed: Element[] = [];
  constructor(private readonly callback: ResizeCallback) {
    observers.resize.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

class FakeIntersectionObserver {
  disconnected = false;
  observed: Element[] = [];
  constructor(
    private readonly callback: IntersectionCallback,
    readonly options?: IntersectionObserverInit
  ) {
    observers.intersection.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  /** Say each of these elements (default: every one watched) came into view or left it, one entry per element */
  triggerFor(isIntersecting: boolean, elements: Element[] = this.observed) {
    this.callback(elements.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry), this as unknown as IntersectionObserver);
  }
}

export const observers = {
  resize: [] as FakeResizeObserver[],
  intersection: [] as FakeIntersectionObserver[],
  reset() {
    observers.resize = [];
    observers.intersection = [];
  },
};

export const scrolls: { element: Element; left: number; behavior?: ScrollBehavior }[] = [];

export function installBrowserApis() {
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: ScrollToOptions | number) {
    const left = typeof options === "object" ? (options.left ?? this.scrollLeft) : (options ?? this.scrollLeft);
    scrolls.push({ element: this, left, behavior: typeof options === "object" ? options.behavior : undefined });
    this.scrollLeft = left;
    this.dispatchEvent(new Event("scroll"));
  } as typeof HTMLElement.prototype.scrollTo;
}

export function resetBrowserApis() {
  observers.reset();
  scrolls.length = 0;
}
