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
  STATE_UPDATE_BROADCAST = 'STATE_UPDATE_BROADCAST',
  CLIENT_STATE_UPDATE = 'CLIENT_STATE_UPDATE'
}

const DEFAULT_TIMEOUT = 100;

declare global {
  /**
   * Global interface to denote the types of state that are being transferred
   * over a channel.
   */
  interface StateMessengerChannelMap {}
}

interface Endpoint {
  postMessage(msg: {}): void;
  addEventListener(
      type: 'message', listener: (this: Endpoint, ev: MessageEvent) => void,
      options?: boolean|AddEventListenerOptions): void;
  removeEventListener(
      type: 'message', listener: (this: Endpoint, ev: MessageEvent) => void,
      options?: boolean|EventListenerOptions): void;
  close(): void;
}

interface ChannelOptions {
  broadcastChannelConstructor?: new(channel: string) => Endpoint;
}

/**
 * Master node for state communication. Use {@link
 * MasterStateMessenger#create()} to construct an instance. For TypeScript
 * users, make sure to specify the type of state that you are communicating over
 * the channel in the global {@link StateMessengerChannelMap} interface.
 */
export class MasterStateMessenger<S> {
  state: S;
  channel: Endpoint;

  private constructor(
      channel: string, initialState: S, options: ChannelOptions) {
    const {broadcastChannelConstructor = BroadcastChannel} = options;
    this.channel = new broadcastChannelConstructor(channel);
    this.state = initialState;
  }

  /**
   * Construct a master that broadcasts state updates to the BroadcastChannel
   * with name "channel".
   *
   * @param channel The channel name that is used to communicate.
   */
  static create<C extends keyof StateMessengerChannelMap>(
      channel: C, initialState: StateMessengerChannelMap[C],
      options: ChannelOptions = {}) {
    return new MasterStateMessenger(channel, initialState, options);
  }

  /**
   * Start the master. It will announce to all connected clients that it can now
   * start broadcasting state updates. Whenever a client is connected to the
   * channel, it will automatically receive the current state from the master.
   */
  start() {
    this.announceExistenceForClients();
    this.announceStateToClients();
    this.channel.addEventListener('message', ({data}) => {
      const {type} = data;
      if (type === BroadCastType.CLIENT_EXISTS_BROADCAST) {
        this.announceExistenceForClients();
      } else if (type === BroadCastType.CLIENT_STATE_UPDATE) {
        this.setState(data.state);
      }
    });
  }

  close() {
    this.channel.close();
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
    this.channel.postMessage({type: BroadCastType.MASTER_EXISTS_BROADCAST});
  }

  private announceStateToClients() {
    this.channel.postMessage(
        {type: BroadCastType.STATE_UPDATE_BROADCAST, state: this.state});
  }
}

type StateCallback<S> = (state: S) => void;
type MessageEventListener = (event: MessageEvent) => void;

interface ClientChannelOptions extends ChannelOptions {
  timeout?: number;
}

/**
 * Client node for state communication. Use {@link
 * ClientStateMessenger#create()} to construct an instance. For TypeScript
 * users, make sure to specify the type of state that you are communicating over
 * the channel in the global {@link StateMessengerChannelMap} interface.
 */
export class ClientStateMessenger<S> {
  callbackMap = new Map<StateCallback<S>, MessageEventListener>();
  timeout: number;
  channel: Endpoint;

  private constructor(channel: string, options: ClientChannelOptions) {
    const {
      timeout = DEFAULT_TIMEOUT,
      broadcastChannelConstructor = BroadcastChannel
    } = options;
    this.channel = new broadcastChannelConstructor(channel);

    this.timeout = timeout;
  }

  /**
   * Construct a client that listens to the BroadcastChannel with name
   * "channel".
   *
   * @param channel The channel name that is used to communicate.
   */
  static create<C extends keyof StateMessengerChannelMap>(
      channel: C, options: ClientChannelOptions = {}) {
    return new ClientStateMessenger<StateMessengerChannelMap[C]>(
        channel, options);
  }

  /**
   * Start the client while waiting on the master for state updates. If the
   * master does not respond within {@link #timeout}ms, the returnging Promise
   * is rejected. If you require state immediately, make sure to call {@link
   * #listen(StateCallback)} first.
   */
  start() {
    return this.waitForMasterExistence();
  }

  close() {
    for (const callback of this.callbackMap.values()) {
      this.channel.removeEventListener('message', callback);
    }

    this.callbackMap.clear();
    this.channel.close();
  }

  /**
   * Listen for any changes broadcasted by the master. Make sure that the
   * client is started by invoking {@link #start()} first.
   * @param callback Callback function that supplies the new state.
   */
  listen(callback: StateCallback<S>) {
    const eventCallback = (event: MessageEvent) => {
      if (event.data &&
          event.data.type === BroadCastType.STATE_UPDATE_BROADCAST) {
        callback(event.data.state);
      }
    };

    this.callbackMap.set(callback, eventCallback);
    this.channel.addEventListener('message', eventCallback);
  }

  /**
   * Unlisten to state changes.
   *
   * @param callback The original callback function that was passed
   *     into {@link #listen(callback)}.
   */
  unlisten(callback: StateCallback<S>) {
    const eventCallback = this.callbackMap.get(callback);

    if (eventCallback) {
      this.channel.removeEventListener('message', eventCallback);
    }
  }

  send(state: S) {
    this.channel.postMessage({type: BroadCastType.CLIENT_STATE_UPDATE, state});
  }

  private waitForMasterExistence() {
    return new Promise((resolve, reject) => {
      const initialExistenceListener = ({data}: MessageEvent) => {
        if (data.type === BroadCastType.MASTER_EXISTS_BROADCAST) {
          this.channel.removeEventListener('message', initialExistenceListener);

          resolve();
        }
      };

      setTimeout(() => {
        this.channel.removeEventListener('message', initialExistenceListener);

        reject(new Error(`Timed out connecting to master. Make sure the master is available within ${
            this.timeout}ms. If you require a longer timeout, add "timeout" in the constructor of the client.`));
      }, this.timeout);

      this.channel.addEventListener('message', initialExistenceListener);
      this.channel.postMessage({type: BroadCastType.CLIENT_EXISTS_BROADCAST});
    });
  }
}
