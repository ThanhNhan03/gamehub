declare module 'pokersolver' {
  interface ResolvedHand {
    readonly name: string;
    readonly descr: string;
  }
  const pokerSolver: {
    Hand: {
      solve(cards: string[]): ResolvedHand;
      winners(hands: ResolvedHand[]): ResolvedHand[];
    };
  };
  export = pokerSolver;
}
