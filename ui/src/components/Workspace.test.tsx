import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Workspace from './Workspace';

// Mock large dependencies
vi.mock('@lumvalepdf/core', () => ({
  LumvalePDFEngine: vi.fn().mockImplementation(() => ({
    loadDocument: vi.fn(),
    exportBytes: vi.fn(),
    getPageCount: vi.fn().mockReturnValue(1),
    getMetadata: vi.fn(),
    isEncrypted: false,
    compressDocument: vi.fn()
  }))
}));

vi.mock('./PDFCanvas', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-pdf-canvas">PDF Canvas</div>
}));

vi.mock('./Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-sidebar">Sidebar</div>
}));

describe('Workspace Component', () => {
  it('renders without crashing', () => {
    // Provide a dummy 10-byte document
    const dummyBytes = new Uint8Array(10);
    
    const { getByTestId, container } = render(
      <Workspace documentBytes={dummyBytes} pageCount={1} />
    );

    // If it mounts and renders the sidebar, it means there are no syntax/render errors.
    expect(getByTestId('mock-sidebar')).toBeInTheDocument();
    expect(getByTestId('mock-pdf-canvas')).toBeInTheDocument();
  });
});
