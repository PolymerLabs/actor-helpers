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

enum BroadCastType {
  MASTER_EXISTS_BROADCAST = 'MASTER_EXISTS_BROADCAST',
  CLIENT_EXISTS_BROADCAST = 'CLIENT_EXISTS_BROADCAST',
  STATE_UPDATE_BROADCAST = 'STATE_UPDATE_BROADCAST'
}

const DEFAULT_TIMEOUT = 100;

declare global {
  /**
   * Global interface to denote the types of state that are being transferred
   * over a channel.
   */
  interface StateMessengerChannelMap {}
}

/**
 * Master node for state communication. Use {@link
 * MasterStateMessenger#create()} to construct an instance. For TypeScript
 * users, make sure to specify the type of state that you are communicating over
 * the channel in the global {@link StateMessengerChannelMap} interface.
 */
export class MasterStateMessenger<S> extends BroadcastChannel {
  state: S;

  private constructor(channel: string, initialState: S) {
    super(channel);

    this.state = initialState;
  }

  /**
   * Construct a master that broadcasts state updates to the BroadcastChannel
   * with name "channel".
   *
   * @param channel The channel name that is used to communicate.
   */
  static create<C extends keyof StateMessengerChannelMap>(
      channel: C, initialState: StateMessengerChannelMap[C]) {
    return new MasterStateMessenger(channel, initialState);
  }

  /**
   * Start the master. It will announce to all connected clients that it can now
   * start broadcasting state updates. Whenever a client is connected to the
   * channel, it will automatically receive the current state from the master.
   */
  start() {
    this.announceExistenceForClients();
    this.announceStateToClients();
    this.addEventListener('message', ({data}) => {
      if (data === BroadCastType.CLIENT_EXISTS_BROADCAST) {
        this.announceExistenceForClients();
      }
    });
  }

  /**
   * Send a new state update to all connecting clients.
   * @param state The new state object to publish. Make sure that the object can
   *     be structurally cloned. See
   *     https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#Supported_types
   */
  setState(state: S) {
    this.state = state;
    this.announceStateToClients();
  }

  private announceExistenceForClients() {
    this.postMessage(BroadCastType.MASTER_EXISTS_BROADCAST);
  }

  private announceStateToClients() {
    this.postMessage(
        {type: BroadCastType.STATE_UPDATE_BROADCAST, state: this.state});
  }
}

type StateCallback<S> = (state: S) => void;
type MessageEventListener = (event: MessageEvent) => void;

/**
 * Client node for state communication. Use {@link
 * ClientStateMessenger#create()} to construct an instance. For TypeScript
 * users, make sure to specify the type of state that you are communicating over
 * the channel in the global {@link StateMessengerChannelMap} interface.
 */
export class ClientStateMessenger<S> extends BroadcastChannel {
  callbackMap = new Map<StateCallback<S>, MessageEventListener>();
  timeout: number;

  private constructor(channel: string, timeout?: number) {
    super(channel);

    this.timeout = timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Construct a client that listens to the BroadcastChannel with name
   * "channel".
   *
   * @param channel The channel name that is used to communicate.
   */
  static create<C extends keyof StateMessengerChannelMap>(channel: C) {
    return new ClientStateMessenger<StateMessengerChannelMap[C]>(channel);
  }

  /**
   * Start the client while waiting on the master for state updates. If the
   * master does not respond within {@link #timeout}ms, the returnging Promise
   * is rejected.
   */
  start() {
    return this.waitForMasterExistence();
  }

  /**
   * Listen for any changes broadcasted by the master. Make sure that the client
   * is started by invoking {@link #start()} first.
   * @param callback Callback function that supplies the new state.
   */
  listen(callback: StateCallback<S>) {
    function eventCallback(event: MessageEvent) {
      if (event.data &&
          event.data.type === BroadCastType.STATE_UPDATE_BROADCAST) {
        callback(event.data.state);
      }
    }

    this.callbackMap.set(callback, eventCallback);
    this.addEventListener('message', eventCallback);
  }

  /**
   * Unlisten to state changes.
   *
   * @param callback The original callback function that was passed into {@link
   *     #listen(callback)}.
   */
  unlisten(callback: StateCallback<S>) {
    const eventCallback = this.callbackMap.get(callback);

    if (eventCallback) {
      this.removeEventListener('message', eventCallback);
    }
  }

  private waitForMasterExistence() {
    return new Promise((resolve, reject) => {
      const initialExistenceListener = ({data}: MessageEvent) => {
        if (data === BroadCastType.MASTER_EXISTS_BROADCAST) {
          this.removeEventListener('message', initialExistenceListener);

          resolve();
        }
      };

      setTimeout(() => {
        this.removeEventListener('message', initialExistenceListener);

        reject(`Timed out connecting to master. Make sure the master is available within ${
            this.timeout}ms. If you require a longer timeout, add "timeout" in the constructor of the client.`);
      }, this.timeout);

      this.addEventListener('message', initialExistenceListener);
      this.postMessage(BroadCastType.CLIENT_EXISTS_BROADCAST);
    });
  }
}
