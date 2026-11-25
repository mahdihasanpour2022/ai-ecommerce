import type { ProductSpecification, ProductSpecifications } from '../interfaces/product-contract';
import type { ProductMainSpec } from '../schemas/product-main-spec-schema';

function toSpecifications(items: readonly ProductMainSpec[]): ProductSpecification[] {
  return items.map(({ key, value }) => ({ title: key, description: value }));
}

function specificationsEqual(current: ProductSpecifications, next: ProductSpecifications): boolean {
  return (
    current.length === next.length &&
    current.every(
      ({ title, description }, index) =>
        title === next[index]?.title && description === next[index]?.description,
    )
  );
}

export function buildMainSpecificationsPayload(
  mainItems: readonly ProductMainSpec[],
  specificationItems: readonly ProductMainSpec[] = [],
): {
  readonly specifications: ProductSpecifications;
  readonly mainSpecs: ProductSpecifications;
} {
  const mainSpecs = toSpecifications(mainItems);
  return {
    specifications: toSpecifications([...mainItems, ...specificationItems]),
    mainSpecs,
  };
}

export function buildChangedMainSpecificationsPayload(
  currentMainSpecs: ProductSpecifications,
  mainItems: readonly ProductMainSpec[],
  currentSpecifications: ProductSpecifications = currentMainSpecs,
  specificationItems?: readonly ProductMainSpec[],
): ReturnType<typeof buildMainSpecificationsPayload> | undefined {
  const nextMainSpecs = toSpecifications(mainItems);
  const mainUnchanged = specificationsEqual(currentMainSpecs, nextMainSpecs);

  const currentMainTitles = new Set(
    currentMainSpecs.map(({ title }) => title.toLocaleLowerCase('en-US')),
  );
  const currentSecondarySpecifications = currentSpecifications.filter(
    ({ title }) => !currentMainTitles.has(title.toLocaleLowerCase('en-US')),
  );

  if (specificationItems !== undefined) {
    const nextSecondarySpecifications = toSpecifications(specificationItems);
    const secondaryUnchanged = specificationsEqual(
      currentSecondarySpecifications,
      nextSecondarySpecifications,
    );
    return mainUnchanged && secondaryUnchanged
      ? undefined
      : buildMainSpecificationsPayload(mainItems, specificationItems);
  }

  if (mainUnchanged) return undefined;

  const nextMainTitles = new Set(
    nextMainSpecs.map(({ title }) => title.toLocaleLowerCase('en-US')),
  );
  const secondarySpecifications = currentSecondarySpecifications.filter(
    ({ title }) => !nextMainTitles.has(title.toLocaleLowerCase('en-US')),
  );
  return {
    specifications: [...nextMainSpecs, ...secondarySpecifications],
    mainSpecs: nextMainSpecs,
  };
}
