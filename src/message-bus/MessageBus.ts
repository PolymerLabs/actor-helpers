export interface Endpoint {
  name: string;
  postMessage(msg: {}): void;
  addEventListener(
    type: "message",
    listener: (this: Endpoint, ev: MessageEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "message",
    listener: (this: Endpoint, ev: MessageEvent) => void,
    options?: boolean | EventListenerOptions
  ): void;
  close(): void;
}

export type BroadcastChannelConstructor = new (channel: string) => Endpoint;

export interface ChannelOptions {
  broadcastChannelConstructor?: BroadcastChannelConstructor;
  channel: string;
}

declare global {
  interface MessageBusType {}
}

export type ValidMessageBusName = keyof MessageBusType;

export interface Transferable<Type extends ValidMessageBusName> {
  type: Type;
  detail: MessageBusType[Type];
}

export class MessageBus {
  private readonly channel: Endpoint;

  private constructor(options: ChannelOptions) {
    const { broadcastChannelConstructor = BroadcastChannel, channel } = options;
    this.channel = new broadcastChannelConstructor(channel);
  }

  static createEndpoint(options: ChannelOptions) {
    return new MessageBus(options);
  }

  addEventListener<MessageType extends ValidMessageBusName>(
    eventType: MessageType,
    callback: (detail: MessageBusType[MessageType]) => void
  ) {
    const channelCallback = ({ data }: MessageEvent) => {
      const { type, detail } = data as Transferable<MessageType>;

      if (type === eventType) {
        callback(detail);
      }
    };
    this.channel.addEventListener("message", channelCallback);

    return () => {
      this.channel.removeEventListener("message", channelCallback);
    };
  }

  dispatchEvent<MessageType extends ValidMessageBusName>(
    type: MessageType,
    detail: MessageBusType[MessageType]
  ) {
    this.channel.postMessage({
      type,
      detail
    });
  }

  close() {
    this.channel.close();
  }
}
