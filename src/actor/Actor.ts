import { WatchableMessageStore } from "../watchable-message-store/WatchableMessageStore.js";

declare global {
  /**
   * The type of messages that can be sent to an actor. To define the type
   * of messages actor with name "ui" could receive,
   * define the following in your TS file:
   *
   *    interface State {
   *      count: number;
   *    }
   *
   *    declare global {
   *      interface ActorMessageType {
   *        ui: State;
   *      }
   *    }
   */
  interface ActorMessageType {}
}

/**
 * All actor names that are defined in {@link ActorMessageType}.
 */
export type ValidActorMessageName = keyof ActorMessageType;

/**
 * A base-class to define an Actor type. It requires all sub-classes to
 * implement the {@link Actor#onMessage} callback.
 *
 *    class MyActor extends Actor<MessageType> {
 *      onMessage(message: MessageType) {
 *        console.log(`Actor ${this.actorName} I received message: ${message}`);
 *      }
 *    }
 *
 * If you would like to perform some initialization logic, implement the
 * optional {@link Actor#init} callback.
 *
 *    class MyActor extends Actor<MessageType> {
 *      count: number;
 *
 *      init() {
 *        this.count = 0;
 *      }
 *
 *      onMessage(message: MessageType) {
 *        this.count++;
 *        console.log(`Actor ${this.actorName} received message number ${this.count}: ${message}`);
 *      }
 *    }
 *
 * If you want to know the actorName that this actor is assigned to in your
 * application, you can use `actorName`. This field is accessible only after
 * the {@link hookup} has been called.
 *
 * Users of this actor generally should not use {@link Actor#initPromise}. This
 * is an internal implementation detail for {@link hookup}.
 */
export abstract class Actor<T, R = void> {
  /**
   * Do not use, it is an internal implementation detail used in {@link hookup}.
   */
  readonly initPromise: Promise<void>;

  /**
   * The name given to this actor by calling {@link hookup}.
   */
  actorName?: ValidActorMessageName;

  constructor() {
    // Run init in the next microtask
    this.initPromise = Promise.resolve().then(() => this.init());
  }

  /**
   * Init callback that can be used to perform some initialization logic.
   * This method is invoked in the constructor of an {@link Actor} and should
   * not be called by any user of the actor subclass.
   *
   * @return A promise which resolves once this actor is initialized.
   */
  async init(): Promise<void> {}

  /**
   * Callback to process a message that was sent to this actor.
   *
   * Note that this callback is synchronous. This means that if an actor needs
   * to perform expensive work (for example, encode an image), you need to
   * perform this work asynchronously.
   *
   *    class MyActor extends Actor<MessageType> {
   *      onMessage(message: MessageType) {
   *        Promise.resolve().then(() => this.performExpensiveWork());
   *      }
   *
   *      async performExpensiveWork() {
   *        // Some long running task here
   *      }
   *    }
   *
   *
   * For TypeScript users, this requires the specification
   * of the {@link ActorMessageType}:
   *
   *    interface State {
   *      count: number;
   *    }
   *
   *    declare global {
   *      interface ActorMessageType {
   *        ui: State;
   *      }
   *    }
   *
   * @param message The message that was sent to this actor.
   */
  abstract onMessage(message: T): R;
}

const messageStore = new WatchableMessageStore("ACTOR-MESSAGES");

/**
 * The callback-type which is returned by {@link hookup} that can be used
 * to remove an {@link Actor} from the system.
 */
export type HookdownCallback = () => Promise<void>;

/**
 * Hookup an {@link Actor} with a name into system. In this case, the actor
 * will initialize and respond to any messages designated for `actorName`.
 *
 * For example, if you have an actor that can work with a user interface
 * (typically the DOM) then perform the following:
 *
 *    hookup("ui", new UIActor());
 *
 * In general, the system of actors should be asynchronous. This means that
 * messages can arrive at any time and actors are hooked up in any arbitrary
 * order. To that end, you can not rely on specific timing when an actor is
 * available. However, you can `await` the `hookup` invocation if you want to
 * be certain that the actor is now available in the system:
 *
 *    await hookup("ui", new UIActor());
 *
 * If you would like to send a message to the "ui" actor, use {@link lookup}.
 *
 * @param actorName The name this actor will listen to.
 * @param actor The actor implementation that can process messages.
 * @param purgeExistingMessages Whether any messages that arrived before this
 *    actor was ready should be discarded.
 * @return A promise which, once resolved, provides a callback that can be
 *    invoked to remove this actor from the system.
 */
export async function hookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName,
  actor: Actor<ActorMessageType[ActorName]>,
  { purgeExistingMessages = false }: { purgeExistingMessages?: boolean } = {}
): Promise<HookdownCallback> {
  actor.actorName = actorName;
  await actor.initPromise;

  if (purgeExistingMessages) {
    await messageStore.popMessages(actorName);
  }

  const hookdown = messageStore.subscribe(actorName, messages => {
    for (const message of messages) {
      try {
        actor.onMessage(message.detail as ActorMessageType[ActorName]);
      } catch (e) {
        console.error(e);
      }
    }
  });

  return async () => {
    hookdown();
    await messageStore.popMessages(actorName);
  };
}

/**
 * An object that describes a convenience method to send a message to a specific
 * actor. Use {@link lookup} to obtain a handle to a specific actor.
 */
export interface ActorHandle<ActorName extends ValidActorMessageName> {
  /**
   * Send a message to this specific actor.
   *
   * @param message The message to send to this actor.
   */
  send(message: ActorMessageType[ActorName]): Promise<void>;
}

/**
 * Lookup an actor in the system with the provided `actorName`. This requires
 * the receiving actor to be hooked up with {@link hookup}. If the actor
 * is not yet hooked up in the system, any message that is sent to this actor
 * will be processed once the receiving actor has been initialized.
 *
 *    lookup("ui").send({ count: 5 });
 *
 * If you want to wait until the message has been stored, then `await` the
 * `send` invocation:
 *
 *    await lookup("ui").send({ count: 5 });
 *
 * Note that this does not wait for the receiving actor to actually receive
 * and process the message. Instead, it will only ensure that the message
 * has been stored and is ready to be received by the receiving actor.
 *
 * You can use the resulting {@link ActorHandle} as a convenience in your actor.
 * For example, you can obtain a handle in the {@link Actor#init} callback
 * and send messages in your {@link Actor#onMessage} callback:
 *
 *    class MyActor extends Actor<MessageType> {
 *      count: number;
 *      uiActor: ActorHandle<"ui">
 *
 *      init() {
 *        this.count = 0;
 *        this.uiActor = lookup("ui");
 *      }
 *
 *      onMessage(message: MessageType) {
 *        this.count++;
 *        console.log(`I received message number ${this.count}: ${message}`);
 *        this.uiActor.send({ count: this.count });
 *      }
 *    }
 *
 * @param actorName The name that was given to an actor in the system.
 * @return A convenience handle to send messages directly to a specific actor.
 */
export function lookup<ActorName extends ValidActorMessageName>(
  actorName: ActorName
): ActorHandle<ActorName> {
  return {
    async send(message: ActorMessageType[ActorName]) {
      await messageStore.pushMessage({
        recipient: actorName,
        detail: message
      });
    }
  };
}

/**
 * Remove all existing messages that are sent to any actor. Generally, this
 * method should only be called once, when the application is initialized.
 *
 * We recommend calling this method in your main script once and before any
 * actor is created and hooked up in the system. For example:
 *
 *    // index.js:
 *    async function bootstrap() {
 *      // Remove any messages before hooking up any actor
 *      await initializeQueues();
 *      // We have removed any existing messages. Hook up the UI Actor now
 *      hookup("ui", new UIActor());
 *      // Also, spawn a new worker which will consequently hook up additional
 *      // state and database actors in the system.
 *      new Worker("worker.js");
 *    }
 *    bootstrap();
 *
 *    // worker.js
 *    hookup("state", new StateActor());
 *    hookup("database", new DatabaseActor());
 */
export async function initializeQueues() {
  await messageStore.popMessages("*");
}
