/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ClientStateMessenger, MasterStateMessenger} from '../../state-messenger/StateMessenger.js';

declare var window: {Mocha: Mocha.MochaGlobals, assert: Chai.Assert};

const {suite, teardown, test} = window.Mocha;
const {assert} = window;

interface State {
  foo: string;
  bar: {baz: number;};
}

declare global {
  interface StateMessengerChannelMap {
    'channel': State;
  }
}

declare var Worker: {
  prototype: Worker; new (stringUrl: string, options?: {type: string}): Worker;
};

const TIMEOUT = 10;

suite('StateMessenger', () => {
  suite('initialization', () => {
    let firstClient: ClientStateMessenger<State>,
        secondClient: ClientStateMessenger<State>,
        master: MasterStateMessenger<State>, worker: Worker;

    const state = {foo: '', bar: {baz: 5}};
    const newState = {foo: 'Updated', bar: {baz: 6}};

    const currentUrl = (import.meta as {url: string}).url;

    teardown(() => {
      if (firstClient) {
        firstClient.close();
      }
      if (secondClient) {
        secondClient.close();
      }
      if (master) {
        master.close();
      }
      if (worker) {
        worker.terminate();
      }
    });

    function retrieveStateMessage(client: ClientStateMessenger<State>) {
      return new Promise((resolve) => {
        const callback = (callbackState: State) => {
          resolve(callbackState);
        };

        client.listen(callback);
      });
    }

    test('works when master is available first', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel', {timeout: TIMEOUT});

      master.start();

      await new Promise((resolve) => {
        setTimeout(async () => {
          await firstClient.start();

          resolve();
        }, TIMEOUT / 2);
      });
    });

    test('works when worker is available first', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel', {timeout: TIMEOUT});

      const clientPromise = firstClient.start();

      await new Promise((resolve) => {
        setTimeout(async () => {
          master.start();

          await clientPromise;

          resolve();
        }, TIMEOUT / 2);
      });
    });

    test('client errors when master is not available', async () => {
      firstClient = ClientStateMessenger.create('channel');

      try {
        await firstClient.start();
      } catch (e) {
        assert.include(e.message, 'Timed out');
        return;
      }

      throw new Error(`Client should have timed out, but it did not.`);
    });

    test('client retrieves state when starting', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      master.start();

      const firstMessagePromise = retrieveStateMessage(firstClient);
      await firstClient.start();
      assert.deepEqual(await firstMessagePromise, state);
    });

    test('client can listen to state changes', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      master.start();
      await firstClient.start();
      await retrieveStateMessage(firstClient);

      master.setState(newState);
      assert.deepEqual(await retrieveStateMessage(firstClient), newState);
    });

    test('multiple clients receive the same state changes', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');
      secondClient = ClientStateMessenger.create('channel');

      master.start();
      await Promise.all([firstClient.start(), secondClient.start()]);

      await Promise.all([
        retrieveStateMessage(firstClient), retrieveStateMessage(secondClient)
      ]);

      master.setState(newState);

      const [firstState, secondState] = await Promise.all([
        retrieveStateMessage(firstClient), retrieveStateMessage(secondClient)
      ]);
      assert.deepEqual(firstState, newState);
      assert.deepEqual(secondState, newState);
    });

    test(
        'does not receive any updates when immediately calling unlisten',
        async () => {
          master = MasterStateMessenger.create('channel', state);
          firstClient = ClientStateMessenger.create('channel');

          master.start();
          await firstClient.start();

          await retrieveStateMessage(firstClient);

          master.setState(newState);

          function assertCallback() {
            assert.fail(
                `Callback should not be invoked after listener is removed`);
          }

          firstClient.listen(assertCallback);
          firstClient.unlisten(assertCallback);

          await new Promise((resolve) => {
            setTimeout(() => {
              resolve();
            }, TIMEOUT);
          });
        });

    test('does not receive any updates after unlisten', async () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      master.start();
      await firstClient.start();

      await retrieveStateMessage(firstClient);

      master.setState(newState);

      await new Promise(async (resolveOuterPromise, reject) => {
        let called = 0;
        let resolveInnerPromise: () => void;
        const callback = () => {
          called++;

          if (called === 2) {
            reject(new Error(
                `Callback should not be invoked after listener is removed`));
          } else {
            resolveInnerPromise();
          }
        };

        await new Promise((resolve) => {
          resolveInnerPromise = resolve;
          firstClient.listen(callback);
        });

        master.setState(state);

        firstClient.unlisten(callback);

        setTimeout(() => {
          assert.equal(called, 1);
          resolveOuterPromise();
        }, TIMEOUT);
      });
    });

    test('works when master is in worker', async () => {
      worker = new Worker(
          new URL('StateMessengerWorker.js', currentUrl).toString(),
          {type: 'module'});
      worker.postMessage('create');
      firstClient = ClientStateMessenger.create('channel');

      await firstClient.start();

      await retrieveStateMessage(firstClient);

      worker.postMessage('setState');

      assert.deepEqual(await retrieveStateMessage(firstClient), newState);
    });

    test(
        'one client can send updates to other clients via the master',
        async () => {
          master = MasterStateMessenger.create('channel', state);
          firstClient = ClientStateMessenger.create('channel');
          secondClient = ClientStateMessenger.create('channel');

          master.start();
          await Promise.all([firstClient.start(), secondClient.start()]);

          await new Promise((resolve) => {
            setTimeout(async () => {
              firstClient.send(newState);

              const [firstState, secondState] = await Promise.all([
                retrieveStateMessage(firstClient),
                retrieveStateMessage(secondClient)
              ]);
              assert.deepEqual(firstState, newState);
              assert.deepEqual(secondState, newState);

              resolve();
            }, TIMEOUT);
          });
        });
  });
});
