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

function makeBoardArray(): string[][] {
  const board = [];
  for (let i = 0; i < 8; i++) {
    board.push(new Array(8).fill(""));
  }

  return board;
}

export function fenToArray(fen: string) {
  const board = makeBoardArray();
  const pieces = fen.split(" ")[0];
  const rows = pieces.split("/");
  if (rows.length !== 8) {
    throw new Error("Invalid fen: too few rows.");
  }

  for (let row = 0; row < rows.length; row++) {
    const rowValue = rows[row];
    let location = 0;
    for (const column of rowValue) {
      if (Number(column)) {
        location += Number(column);
        continue;
      }

      board[row][location] = column;
      location++;
    }
  }

  return board;
}
