export interface SubmissionGate<TArgs extends readonly unknown[], TResult> {
  run(action: (...args: TArgs) => Promise<TResult>, ...args: TArgs): Promise<TResult>;
}

export function createSubmissionGate<TArgs extends readonly unknown[], TResult>(): SubmissionGate<
  TArgs,
  TResult
> {
  let active: Promise<TResult> | null = null;
  return {
    run(action, ...args) {
      if (active) return active;
      active = action(...args).finally(() => {
        active = null;
      });
      return active;
    },
  };
}
