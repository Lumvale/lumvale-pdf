import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import TopBar from './TopBar';

// Only the required callbacks; the menu-bar rendering is what we exercise here.
const baseProps = {
  onExport: vi.fn(),
  onMerge: vi.fn(),
  onExtract: vi.fn(),
  onSplit: vi.fn(),
  onCompress: vi.fn(),
  onWatermark: vi.fn(),
  onMetadata: vi.fn(),
  onEncrypt: vi.fn(),
  onCheckUpdates: vi.fn(),
  isCompressing: false,
  isEditMode: false,
};

describe('TopBar — hideToolsMenu', () => {
  it('renders the built-in Tools menu by default', () => {
    const { queryByRole } = render(<TopBar {...baseProps} />);
    expect(queryByRole('button', { name: 'Tools' })).not.toBeNull();
  });

  it('drops the Tools menu from the DOM entirely when hidden (not just CSS-hidden)', () => {
    const { queryByRole } = render(<TopBar {...baseProps} hideToolsMenu />);
    // Must be absent from the DOM/tab order, not merely display:none — the host
    // has folded those ops into its own menus.
    expect(queryByRole('button', { name: 'Tools' })).toBeNull();
  });

  it('still renders host customMenus when the Tools menu is hidden', () => {
    const { queryByRole } = render(
      <TopBar
        {...baseProps}
        hideToolsMenu
        customMenus={[{ id: 'edit', label: 'Edit', items: <span>item</span> }]}
      />,
    );
    expect(queryByRole('button', { name: 'Tools' })).toBeNull();
    expect(queryByRole('button', { name: 'Edit' })).not.toBeNull();
  });
});
