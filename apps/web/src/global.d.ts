// Global type definitions for React 19
// Re-export JSX namespace from React for backwards compatibility
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface */
import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    interface Element extends ReactJSX.Element {}
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}
