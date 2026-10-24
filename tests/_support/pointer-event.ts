/* jsdom has no `PointerEvent`, so `fireEvent.pointerDown(el, { pointerType: "touch" })` would lose the pointer type that components read
   (touch or mouse). This stand-in is a mouse event that also carries `pointerType` and `pointerId`; `setup.ts` installs it. */

export function installPointerEvent() {
  if (typeof window.PointerEvent !== "undefined") return;
  class TestPointerEvent extends MouseEvent {
    readonly pointerType: string;
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "";
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
}
