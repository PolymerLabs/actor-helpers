export interface MessageChannel {
  name: string;
  postMessage(msg: {}): void;
  addEventListener(
    type: "message",
    listener: (this: MessageChannel, ev: MessageEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "message",
    listener: (this: MessageChannel, ev: MessageEvent) => void,
    options?: boolean | EventListenerOptions
  ): void;
  close(): void;
}

export type BroadcastChannelConstructor = new (
  channel: string
) => MessageChannel;

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

export interface Endpoint {
  addListener<MessageType extends ValidMessageBusName>(
    eventType: MessageType,
    callback: (detail: MessageBusType[MessageType]) => void
  ): () => void;

  dispatch<MessageType extends ValidMessageBusName>(
    type: MessageType,
    detail: MessageBusType[MessageType]
  ): void;

  close(): void;
}

export class MessageBus implements Endpoint {
  private readonly channel: MessageChannel;

  private constructor(options: ChannelOptions) {
    const { broadcastChannelConstructor = BroadcastChannel, channel } = options;
    this.channel = new broadcastChannelConstructor(channel);
  }

  static createEndpoint(options: ChannelOptions) {
    return new MessageBus(options);
  }

  addListener<MessageType extends ValidMessageBusName>(
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

  dispatch<MessageType extends ValidMessageBusName>(
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
