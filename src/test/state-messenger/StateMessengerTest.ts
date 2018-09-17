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

suite('StateMessenger', () => {
  suite('initialization', () => {
    let firstClient: ClientStateMessenger<State>,
        secondClient: ClientStateMessenger<State>,
        master: MasterStateMessenger<State>;

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
    });

    /**
     * If we `.postMessage` on a channel, the eventListeners of the other
     * channels will be executed AFTER the microtask. This means that if we
     * start both master and client in the same microTask, the client WILL
     * receive the postMessage from the master, even though that was executed
     * before the client was started.
     *
     * @param callback The callback to execute.
     */
    function forceMicroTask(callback: () => Promise<any>| void) {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            resolve(await callback());
          } catch (e) {
            reject(e);
          }
        }, 1);
      });
    }

    test('works when master is available first', () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      master.start();

      return forceMicroTask(() => firstClient.start());
    });

    test('works when worker is available first', () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      firstClient.start();

      return forceMicroTask(() => master.start());
    });

    test('client errors when master is not available', () => {
      firstClient = ClientStateMessenger.create('channel');

      return new Promise(async (resolve, reject) => {
        try {
          await firstClient.start();

          reject(`Client should have timed out, but it did not.`);
        } catch (_e) {
          resolve();
        }
      });
    });

    test('client can listen to state changes', (done) => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      firstClient.listen((callbackState: State) => {
        assert.deepEqual(callbackState, newState);
        done();
      });

      master.setState(newState);
    });

    test('multiple clients receive the same state changes', (done) => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');
      secondClient = ClientStateMessenger.create('channel');

      let called = 0;

      function assertCallback(callbackState: State) {
        assert.deepEqual(callbackState, newState);
        called++;

        if (called === 2) {
          done();
        }
      }

      firstClient.listen(assertCallback);
      secondClient.listen(assertCallback);

      master.setState(newState);
    });

    test(
        'does not receive any updates when immediately calling unlisten',
        () => {
          master = MasterStateMessenger.create('channel', state);
          firstClient = ClientStateMessenger.create('channel');

          function assertCallback() {
            assert.fail(
                'Callback should not be invoked after listener is removed');
          }

          firstClient.listen(assertCallback);
          firstClient.unlisten(assertCallback);

          master.setState(newState);

          // Force a microtask here to make sure the postMessage is actually
          // invoked to make sure we check the callback is not invoked
          return forceMicroTask(() => {});
        });

    test('does not receive any updates after unlisten', () => {
      master = MasterStateMessenger.create('channel', state);
      firstClient = ClientStateMessenger.create('channel');

      let called = 0;

      function assertCallback(callbackState: State) {
        assert.deepEqual(callbackState, newState);
        called++;

        if (called === 2) {
          assert.fail(
              'Callback should not be invoked after listener is removed');
        }
      }

      master.setState(newState);

      return forceMicroTask(() => {
        firstClient.unlisten(assertCallback);

        master.setState(state);

        // Force a microtask here to make sure the postMessage is actually
        // invoked to make sure we check the callback is not invoked
        return forceMicroTask(() => {});
      });
    });

    test('works when master is in worker', (done) => {
      const worker = new Worker(
          new URL('StateMessengerWorker.js', currentUrl).toString(),
          {type: 'module'});
      firstClient = ClientStateMessenger.create('channel');

      firstClient.listen((callbackState) => {
        assert.deepEqual(callbackState, newState);
        done();
      });

      worker.postMessage('');
    });
  });
});
