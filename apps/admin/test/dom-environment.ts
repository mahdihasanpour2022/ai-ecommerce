import { JSDOM } from 'jsdom';

const GLOBAL_NAMES = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'MutationObserver',
  'SVGElement',
  'ShadowRoot',
  'getComputedStyle',
] as const;

interface SavedDescriptor {
  readonly name: (typeof GLOBAL_NAMES)[number];
  readonly descriptor: PropertyDescriptor | undefined;
}

export function installDomEnvironment(): () => void {
  const dom = new JSDOM('<!doctype html><html lang="fa-IR" dir="rtl"><body></body></html>', {
    url: 'http://localhost:3001/',
  });
  const saved: SavedDescriptor[] = GLOBAL_NAMES.map((name) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(globalThis, name),
  }));
  const values: Readonly<Record<(typeof GLOBAL_NAMES)[number], unknown>> = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    SVGElement: dom.window.SVGElement,
    ShadowRoot: dom.window.ShadowRoot,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  };

  for (const name of GLOBAL_NAMES) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: values[name],
    });
  }

  Object.defineProperty(dom.window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  // React's legacy input-event fallback probes these IE-only methods when
  // running against JSDOM. Real supported browsers do not need the shim.
  Object.defineProperties(dom.window.HTMLElement.prototype, {
    attachEvent: {
      configurable: true,
      value: () => undefined,
    },
    detachEvent: {
      configurable: true,
      value: () => undefined,
    },
  });

  class TestResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const resizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: TestResizeObserver,
  });

  return () => {
    dom.window.close();
    for (const { name, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (resizeObserverDescriptor) {
      Object.defineProperty(globalThis, 'ResizeObserver', resizeObserverDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    }
  };
}
