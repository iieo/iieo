import type React from 'react';

export type TypedFormElement<TInputs extends string> = {
  readonly elements: { [key in TInputs]: HTMLInputElement } & HTMLFormControlsCollection;
} & HTMLFormElement;

export type SVGProps = React.ComponentProps<'svg'>;
