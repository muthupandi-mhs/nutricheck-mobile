import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar } from '../src/components/TabBar';
import { navBar } from '../src/theme/tokens';
import { ThemeProvider } from '../src/theme/ThemeProvider';

/**
 * The one control that is on screen the whole time the app is in use, and the
 * only one no screen test covers — every screen renders without it, so a bar
 * that threw, or that painted itself the colour of the page, would reach a
 * device before it reached a test.
 */

const routes = [
  { key: 'today-1', name: 'Today' },
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
    state: { index, routes, key: 'tab', routeNames: ['Today', 'Insights'] },
    navigation: { emit, navigate },
    emit,
    navigate,
  };
}

async function render(index: number, scheme: 'light' | 'dark', p = props(index), onLogPress = jest.fn()) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider force={scheme}>
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
  it.each(['light', 'dark'] as const)('renders both destinations and the action in %s', async scheme => {
    const { tree } = await render(0, scheme);

    expect(byLabel(tree, 'Today').length).toBeGreaterThan(0);
    expect(byLabel(tree, 'Insights').length).toBeGreaterThan(0);
    expect(byLabel(tree, 'Say what you ate').length).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('stays dark in light mode, since it floats over the page rather than sitting in it', async () => {
    const light = await render(0, 'light');
    const dark = await render(0, 'dark');

    const pill = (t: ReactTestRenderer.ReactTestRenderer) =>
      t.root.findAll(
        node =>
          typeof node.type === 'string' &&
          // `style` arrives as an array from Row's own composition.
          [node.props?.style].flat(2).some(s => s?.backgroundColor === navBar.surface),
      );

    // The point of the assertion: the same colour in both schemes. A bar that
    // followed the theme would paint `c.surface` here and differ.
    expect(pill(light.tree).length).toBeGreaterThan(0);
    expect(pill(dark.tree).length).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () => light.tree.unmount());
    await ReactTestRenderer.act(async () => dark.tree.unmount());
  });

  it('marks the focused destination selected, so the reader is not left to infer it from colour', async () => {
    const { tree } = await render(1, 'dark');

    const selected = (label: string) =>
      tree.root.findAll(
        node => node.props?.accessibilityLabel === label && node.props?.accessibilityState,
      )[0]?.props.accessibilityState.selected;

    expect(selected('Insights')).toBe(true);
    expect(selected('Today')).toBe(false);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('navigates on a tap of the destination that is not current', async () => {
    const p = props(0);
    const { tree } = await render(0, 'dark', p);

    await ReactTestRenderer.act(async () => {
      byLabel(tree, 'Insights')[0]!.props.onClick?.();
    });

    expect(p.navigate).toHaveBeenCalledWith('Insights');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does not re-navigate to the destination already showing', async () => {
    const p = props(0);
    const { tree } = await render(0, 'dark', p);

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
    const { tree } = await render(0, 'dark', p, onLogPress);

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
