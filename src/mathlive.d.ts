import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'math-virtual-keyboard-policy'?: string;
          ref?: React.RefObject<any> | ((el: any) => void);
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'math-virtual-keyboard-policy'?: string;
          ref?: React.RefObject<any> | ((el: any) => void);
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
