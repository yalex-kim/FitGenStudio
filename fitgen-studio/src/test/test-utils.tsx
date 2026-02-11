import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import type { ReactElement } from 'react';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps;
}

export function renderWithRouter(
  ui: ReactElement,
  { routerProps, ...options }: CustomRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    ),
    ...options,
  });
}

export { render, screen, waitFor, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
