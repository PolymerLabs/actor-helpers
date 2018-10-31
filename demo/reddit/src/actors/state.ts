import { Actor, lookup } from "westend-helpers/lib/Actor.js";

import { AppState } from "../model/state.js";
import { ViewType } from "../model/view.js";
import { loadSubreddit } from "../model/loading.js";

export enum ActionType {
  NAVIGATION,
  COUNTING
}
export interface CountAction {
  counter: number;
  type: ActionType.COUNTING;
}

export interface NavigationAction {
  path: string;
  type: ActionType.NAVIGATION;
}

export type Action = NavigationAction | CountAction;

const initialState: AppState = {
  stack: [],
  path: "/r/all"
};

export class StateActor extends Actor<Action> {
  private state = initialState;
  private uiActor = lookup("ui");

  async init() {
    this.sendState();
  }

  private sendState() {
    this.uiActor.send(this.state);
  }

  onMessage(action: Action) {
    // @ts-ignore
    this[action.type](action).then(() => {
      this.sendState();
    });
  }

  async [ActionType.NAVIGATION]({ path }: NavigationAction) {
    this.state = {
      ...this.state,
      stack: [
        ...this.state.stack,
        {
          type: ViewType.SUBREDDIT,
          subreddit: await loadSubreddit(path.substr(3))
        }
      ],
      path
    };
  }

  async [ActionType.COUNTING](message: CountAction) {}
}
