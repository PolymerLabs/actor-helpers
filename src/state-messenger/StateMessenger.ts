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
  interface StateMessengerChannelMap {}
}

export class MasterStateMessenger<S> extends BroadcastChannel {
  state: S;

  constructor(channel: string, initialState: S) {
    super(channel);

    this.state = initialState;
  }

  static create<C extends keyof StateMessengerChannelMap>(
      channel: C, initialState: StateMessengerChannelMap[C]) {
    return new MasterStateMessenger(channel, initialState);
  }

  start() {
    this.announceExistenceForClients();
    this.announceStateToClients();
    this.addEventListener('message', ({data}) => {
      if (data === BroadCastType.CLIENT_EXISTS_BROADCAST) {
        this.announceExistenceForClients();
      }
    });
  }

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

export class ClientStateMessenger<S> extends BroadcastChannel {
  callbackMap = new Map<StateCallback<S>, MessageEventListener>();
  timeout: number;

  constructor(channel: string, timeout?: number) {
    super(channel);

    this.timeout = timeout || DEFAULT_TIMEOUT;
  }

  static create<C extends keyof StateMessengerChannelMap>(channel: C) {
    return new ClientStateMessenger<StateMessengerChannelMap[C]>(channel);
  }

  start() {
    return this.waitForMasterExistence();
  }

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
