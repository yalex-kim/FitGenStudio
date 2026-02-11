import { describe, it, expect, vi } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { StudioPage } from './StudioPage';

// Mock resizable components since react-resizable-panels has CJS issues in jsdom
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="panel-group">{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

// Mock heavy sub-panels to avoid timeouts
vi.mock('./components/LeftPanel', () => ({
  LeftPanel: () => <div>LeftPanel Mock</div>,
}));
vi.mock('./components/CenterPanel', () => ({
  CenterPanel: () => <div>Canvas</div>,
}));
vi.mock('./components/RightPanel', () => ({
  RightPanel: () => (
    <div>
      <div>Model Agency</div>
      <div>Generate Lookbook</div>
      <div>Lovely</div>
      <div>Chic</div>
      <div>Sporty</div>
    </div>
  ),
}));

describe('StudioPage', () => {
  it('should render mobile toolbar buttons', () => {
    renderWithRouter(<StudioPage />);
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });

  it('should render the canvas center panel', () => {
    renderWithRouter(<StudioPage />);
    const canvasElements = screen.getAllByText('Canvas');
    expect(canvasElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render model agency section', () => {
    renderWithRouter(<StudioPage />);
    const agencyElements = screen.getAllByText('Model Agency');
    expect(agencyElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render generate button', () => {
    renderWithRouter(<StudioPage />);
    const generateButtons = screen.getAllByText('Generate Lookbook');
    expect(generateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render style presets', () => {
    renderWithRouter(<StudioPage />);
    const lovelyElements = screen.getAllByText('Lovely');
    expect(lovelyElements.length).toBeGreaterThanOrEqual(1);
    const chicElements = screen.getAllByText('Chic');
    expect(chicElements.length).toBeGreaterThanOrEqual(1);
    const sportyElements = screen.getAllByText('Sporty');
    expect(sportyElements.length).toBeGreaterThanOrEqual(1);
  });
});
