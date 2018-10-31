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

export enum Action {
  PAUSE = "PAUSE",
  RESET = "RESET",
  RUNNING = "RUNNING",
  START = "START",
  TICK = "TICK"
}

export enum State {
  PAUSED = "paused",
  RESET = "reset",
  RUNNING = "running",
  TICK = "tick"
}

declare global {
  interface ActorMessageType {
    ui: {};
  }
}

import { h, render } from "preact";
import { Actor, lookup } from "westend-helpers/src/actor/Actor.js";

export interface UIMessage {
  moves: string[];
}

export class UI extends Actor<UIMessage> {
  private lastMove: string | undefined = "";

  onMessage(state: UIMessage) {
    let lastMove: string | undefined = state.moves[state.moves.length - 1];
    if (lastMove === this.lastMove) {
      lastMove = undefined;
    }

    // Initial game render.
    // if (state.actions.indexOf(ActionTypes.START_NEW_GAME) !== -1) {
    //   const cont = state.actions.indexOf(ActionTypes.CONTINUE_GAME) !== -1;
    //   return startScreen(cont);
    // }

    // // Generalized game render.
    // this.board.state = {
    //   check: state.boardState.check,
    //   fen: state.boardState.fen,
    //   interactive: state.actions.indexOf(ActionTypes.MOVE) !== -1,
    //   lastMove
    // };

    // const tmpl = html`
    //   ${styles}

    //   <button id="restart-game">Restart game</button>

    //   <!-- Board -->
    //   ${this.board}

    //   <!-- Check -->
    //   <div id="check">
    //     ${state.boardState.check ? "You are in check." : ""}
    //   </div>

    //   <!-- Overlay -->
    //   ${html`
    //     <div id="overlay" class="${
    //       state.boardState.checkMate ? "visible" : ""
    //     }">
    //       <div id="overlay-message">
    //       ${state.boardState.fen.split(" ")[1] === "w" ? "You Lose" : "You Win"}
    //       </div>
    //       <div id="restart">Click anywhere to restart</div>
    //     </div>`}`;
    // render(tmpl, document.body);
  }
}

// export class DomAdapter extends Base implements AdapterActions {
//   private readonly board = new ChessBoard();
//   private lastMove = "";

//   constructor() {
//     super();

//     document.addEventListener("click", (evt: Event) => {
//       const target = evt.target as HTMLElement;
//       const validTargets = [
//         "overlay",
//         "restart-game",
//         "start-new-game",
//         "continue-game"
//       ];
//       if (validTargets.indexOf(target.id) === -1) {
//         return;
//       }

//       switch (target.id) {
//         case "restart-game":
//           if (!confirm("Are you sure you'd like to restart?")) {
//             break;
//           }
//         // Intentional fall-through to next case.

//         case "overlay":
//           this.send(ActionTypes.RESET, undefined);
//           break;

//         case "start-new-game":
//           this.send(ActionTypes.START_NEW_GAME, undefined);
//           break;

//         case "continue-game":
//           this.send(ActionTypes.CONTINUE_GAME, undefined);
//           break;
//       }
//     });

//     this.board.addEventListener("move", (evt: Event) => {
//       const moveEvt = evt as CustomEvent<string>;
//       this.lastMove = moveEvt.detail;
//       this.send(ActionTypes.MOVE, moveEvt.detail);
//     });
//   }

//   onUpdate(state: Payloads[ActionTypes.UPDATE_STATE]) {

//   }
// }
