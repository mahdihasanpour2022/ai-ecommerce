import type { ProductMainSpec } from '../schemas/product-main-spec-schema';

export function mainSpecsToRecord(items: readonly ProductMainSpec[]): Record<string, string> {
  return Object.fromEntries(items.map(({ key, value }) => [key, value]));
}

export function buildMainSpecificationsPayload(
  mainItems: readonly ProductMainSpec[],
  specificationItems: readonly ProductMainSpec[] = [],
): {
  readonly specifications: Record<string, string>;
  readonly mainSpecs: Record<string, string>;
} {
  const mainSpecs = mainSpecsToRecord(mainItems);
  return {
    specifications: mainSpecsToRecord([...mainItems, ...specificationItems]),
    mainSpecs,
  };
}

export function buildChangedMainSpecificationsPayload(
  currentMainSpecs: Readonly<Record<string, string>>,
  mainItems: readonly ProductMainSpec[],
  currentSpecifications: Readonly<Record<string, string>> = currentMainSpecs,
  specificationItems?: readonly ProductMainSpec[],
): ReturnType<typeof buildMainSpecificationsPayload> | undefined {
  const next = mainSpecsToRecord(mainItems);
  const currentEntries = Object.entries(currentMainSpecs);
  const nextEntries = Object.entries(next);
  const mainUnchanged =
    currentEntries.length === nextEntries.length &&
    currentEntries.every(
      ([key, value], index) => key === nextEntries[index]?.[0] && value === nextEntries[index]?.[1],
    );

  const currentMainKeys = new Set(currentEntries.map(([key]) => key.toLocaleLowerCase('en-US')));
  const currentSecondaryEntries = Object.entries(currentSpecifications).filter(
    ([key]) => !currentMainKeys.has(key.toLocaleLowerCase('en-US')),
  );

  if (specificationItems !== undefined) {
    const nextSecondaryEntries = Object.entries(mainSpecsToRecord(specificationItems));
    const secondaryUnchanged =
      currentSecondaryEntries.length === nextSecondaryEntries.length &&
      currentSecondaryEntries.every(
        ([key, value], index) =>
          key === nextSecondaryEntries[index]?.[0] && value === nextSecondaryEntries[index]?.[1],
      );
    return mainUnchanged && secondaryUnchanged
      ? undefined
      : buildMainSpecificationsPayload(mainItems, specificationItems);
  }

  if (mainUnchanged) return undefined;

  const nextMainKeys = new Set(nextEntries.map(([key]) => key.toLocaleLowerCase('en-US')));
  const secondaryEntries = currentSecondaryEntries.filter(([key]) => {
    const comparisonKey = key.toLocaleLowerCase('en-US');
    return !nextMainKeys.has(comparisonKey);
  });
  return {
    specifications: Object.fromEntries([...nextEntries, ...secondaryEntries]),
    mainSpecs: { ...next },
  };
}
