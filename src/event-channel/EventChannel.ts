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
  name: string;
}

declare global {
  interface EventChannelType {
    init: never;
    initRequest: never;
  }
}

export interface Transferable<Type extends keyof EventChannelType> {
  type: Type;
  detail: EventChannelType[Type];
  uid?: number;
}

export class EventChannel {
  private readonly channel: Endpoint;
  private readonly serviceName: string;

  constructor(options: ChannelOptions) {
    const {
      broadcastChannelConstructor = BroadcastChannel,
      channel,
      name
    } = options;
    this.channel = new broadcastChannelConstructor(channel);
    this.serviceName = name;

    this.announceInit();
    this.channel.addEventListener("message", ({ data }) => {
      if (data.type === "initRequest") {
        this.announceInit();
      }
    });
  }

  private announceInit() {
    this.channel.postMessage({
      type: "init",
      detail: this.serviceName
    });
  }

  serviceReady(services: string[]): Promise<Array<{}>> {
    const readyPromises = Promise.all(
      services.map(
        service =>
          new Promise(resolve => {
            const channelCallback = ({ data }: MessageEvent) => {
              const { type, detail } = data as Transferable<"init">;

              if (type === "init" && detail === service) {
                this.channel.removeEventListener("message", channelCallback);
                resolve();
              }
            };

            this.channel.addEventListener("message", channelCallback);
          })
      )
    );

    this.channel.postMessage({
      type: "initRequest"
    });

    return readyPromises;
  }

  addEventListener<EventType extends keyof EventChannelType>(
    eventType: EventType,
    callback: (detail: EventChannelType[EventType]) => void
  ) {
    this.channel.addEventListener("message", ({ data }) => {
      const { type, detail } = data as Transferable<EventType>;

      if (type === eventType) {
        callback(detail);
      }
    });
  }

  dispatch<EventType extends keyof EventChannelType>(
    type: EventType,
    detail: EventChannelType[EventType]
  ) {
    this.channel.postMessage({
      type,
      detail
    });
  }

  exposeFunction<
    InEventType extends keyof EventChannelType,
    OutEventType extends keyof EventChannelType
  >(
    inEventType: InEventType,
    outEventType: OutEventType,
    func: (
      input: EventChannelType[InEventType]
    ) =>
      | EventChannelType[OutEventType]
      | Promise<EventChannelType[OutEventType]>
  ) {
    const channelCallback = async ({ data }: MessageEvent) => {
      const { type, detail: inputDetail, uid } = data as Transferable<
        InEventType
      >;

      if (type === inEventType) {
        this.channel.postMessage({
          type: outEventType,
          detail: await func(inputDetail),
          uid
        });
      }
    };

    this.channel.addEventListener("message", channelCallback);

    return () => {
      this.channel.removeEventListener("message", channelCallback);
    };
  }

  requestResponse<
    InEvent extends keyof EventChannelType,
    OutEvent extends keyof EventChannelType
  >(
    inEvent: InEvent,
    outEvent: OutEvent,
    detail: EventChannelType[InEvent]
  ): Promise<EventChannelType[OutEvent]> {
    return new Promise(resolve => {
      const uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

      const channelCallback = ({ data }: MessageEvent) => {
        const {
          type,
          detail: outputDetail,
          uid: eventUid
        } = data as Transferable<OutEvent>;

        if (type === outEvent && uid === eventUid) {
          this.channel.removeEventListener("message", channelCallback);
          resolve(outputDetail);
        }
      };
      this.channel.addEventListener("message", channelCallback);

      this.channel.postMessage({
        type: inEvent,
        detail,
        uid
      });
    });
  }

  close() {
    this.channel.close();
  }
}
