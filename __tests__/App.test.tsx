import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

/**
 * Substitutes the transport, not the app.
 *
 * The app has exactly one API implementation now — there is no mock branch to
 * flip. Without this the smoke test would render the signed-out Welcome screen
 * and pass while proving nothing, because every request would fail on a socket
 * that does not exist in Jest. Replacing `createHttpApi` is what gets this test
 * past onboarding and into the screens it exists to render.
 */
jest.mock('../src/api/http/httpApi', () => ({
  createHttpApi: () => require('./fixtures/stubApi').createStubApi(),
}));

/**
 * A smoke render of the whole tree, taken past its loading state.
 *
 * The await matters: the mock API resolves on a timer, and a render test that
 * returns before those land both misses every real screen and leaves state
 * updates firing into a torn-down tree.
 */
test('boots to a rendered screen without throwing', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  // Long enough for getProfile, getGoal, getDay, getRecents and getPhrases.
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(resolve, 900);
    });
  });

  expect(tree!.toJSON()).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    tree!.unmount();
  });
});
