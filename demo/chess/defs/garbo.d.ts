/* tslint:disable */
// We don’t have control over the naming of variables in third party libraries.
declare module "garbo/js/garbochess.js" {
  export const ResetGame: () => string;
  export const GetFen: () => string;
  export const GetMoveFromString: (move: string) => number;
  export const MakeMove: (move: number) => boolean;
  export const FormatMove: (move: number) => string;
  export const GenerateValidMoves: () => number[];
  export const InitializeFromFen: (fen: string) => void;
  export const PVFromHash: (move: number, ply: number) => string;
  export const g_inCheck: boolean;

  export interface SearchCallback {
    (bestMove: number): void;
  }

  export const Search: (callback: SearchCallback, iterations: number) => void;
}
