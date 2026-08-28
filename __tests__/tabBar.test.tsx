import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar } from '../src/components/TabBar';
import { navBar, palette } from '../src/theme/tokens';
import { ThemeProvider } from '../src/theme/ThemeProvider';

/**
 * The one control that is on screen the whole time the app is in use, and the
 * only one no screen test covers — every screen renders without it, so a bar
 * that threw, or that painted itself the colour of the page, would reach a
 * device before it reached a test.
 */

const routes = [
  { key: 'today-1', name: 'Today' },
  { key: 'ideas-1', name: 'Ideas' },
  { key: 'insights-1', name: 'Insights' },
];

/**
 * The slice of `BottomTabBarProps` this component reads. Built as a plain
 * object and cast once at the render, rather than typed as the full navigation
 * prop — the real one is a hundred members deep and none of the rest is touched.
 */
function props(index: number) {
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigate = jest.fn();
  return {
    state: { index, routes, key: 'tab', routeNames: ['Today', 'Ideas', 'Insights'] },
    navigation: { emit, navigate },
    emit,
    navigate,
  };
}

async function render(index: number, p = props(index), onLogPress = jest.fn()) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <TabBar
          {...({ state: p.state, navigation: p.navigation } as unknown as BottomTabBarProps)}
          onLogPress={onLogPress}
        />
      </ThemeProvider>,
    );
  });
  return { tree: tree!, onLogPress, ...p };
}

/** Every node carrying an accessibilityLabel, flattened out of the tree. */
function byLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(
    node => node.props?.accessibilityLabel === label && typeof node.type === 'string',
  );
}

describe('the floating tab bar', () => {
  it('renders every destination and the action', async () => {
    const { tree } = await render(0);

    expect(byLabel(tree, 'Today').length).toBeGreaterThan(0);
    expect(byLabel(tree, 'Ideas').length).toBeGreaterThan(0);
    expect(byLabel(tree, 'Insights').length).toBeGreaterThan(0);
    expect(byLabel(tree, 'Say what you ate').length).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('paints the pill its own colour, not a card colour and not the page colour', async () => {
    const { tree } = await render(0);

    const backgrounds = tree.root
      .findAll(node => typeof node.type === 'string')
      // `style` arrives as an array from Row's own composition.
      .flatMap(node => [node.props?.style].flat(2))
      .map(s => s?.backgroundColor)
      .filter(Boolean);

    // The bar hovers over the page rather than holding it, and says so by
    // being a step lighter than either. Painted `surface` it would read as a
    // card that happens to be at the bottom; painted `canvas`, as nothing.
    expect(backgrounds).toContain(navBar.surface);
    expect(backgrounds).not.toContain(palette.canvas);
    expect(backgrounds).not.toContain(palette.surface);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('marks the focused destination selected, so the reader is not left to infer it from colour', async () => {
    // Index 2, not 1: Ideas sits between Today and Insights. The index is
    // positional, so a tab inserted anywhere but the end moves every one after
    // it -- which is how this test caught the insertion.
    const { tree } = await render(2);

    const selected = (label: string) =>
      tree.root.findAll(
        node => node.props?.accessibilityLabel === label && node.props?.accessibilityState,
      )[0]?.props.accessibilityState.selected;

    expect(selected('Insights')).toBe(true);
    expect(selected('Ideas')).toBe(false);
    expect(selected('Today')).toBe(false);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('navigates on a tap of the destination that is not current', async () => {
    const p = props(0);
    const { tree } = await render(0, p);

    await ReactTestRenderer.act(async () => {
      byLabel(tree, 'Insights')[0]!.props.onClick?.();
    });

    expect(p.navigate).toHaveBeenCalledWith('Insights');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does not re-navigate to the destination already showing', async () => {
    const p = props(0);
    const { tree } = await render(0, p);

    await ReactTestRenderer.act(async () => {
      byLabel(tree, 'Today')[0]!.props.onClick?.();
    });

    // Asserted first, so the expectation below cannot pass merely because the
    // press never landed: the handler ran, emitted, and then declined.
    expect(p.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'today-1' }),
    );
    // Re-entering the current tab would reset its scroll position and, on
    // Today, refetch the day for nothing.
    expect(p.navigate).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('opens the composer from the action, rather than switching destination', async () => {
    const p = props(0);
    const onLogPress = jest.fn();
    const { tree } = await render(0, p, onLogPress);

    await ReactTestRenderer.act(async () => {
      byLabel(tree, 'Say what you ate')[0]!.props.onClick?.();
    });

    expect(onLogPress).toHaveBeenCalled();
    // The action is not a tab. If it ever navigates, a half-written meal is
    // left behind whatever the tap switched to.
    expect(p.navigate).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
