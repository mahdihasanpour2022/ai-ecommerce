# Order Purchase Eligibility Specification

## Scope and current status

The Backend implements the minimum persistent Order slice needed to decide whether an authenticated
Customer has an eligible purchase of a requested Product. This internal prerequisite is shared by
future Product Rating and Product Review writes and authenticated eligibility reads. It does not
provide Checkout, Payment, fulfillment/refund/return workflows, public order history, Admin order
management, or any public Order endpoint.

No production writer currently creates or advances these Order facts. Until a separately approved
Commerce implementation owns that workflow, real-customer eligibility normally remains `false`.
Integration tests may create direct fixtures; production code must not add test endpoints, permanent
seeds, manual `hasPurchased` fields, or other eligibility bypasses.

## Persistent contract

`OrderStatus` and `OrderItemStatus` contain only `PENDING`, `FULFILLED`, `CANCELLED`, and `FAILED`.
An eligible purchase requires both the owning `Order` and its `OrderItem` to be `FULFILLED`, with the
item linked through `ProductVariant` to the requested Product.

Each fulfilled item records a non-null `fulfilledAt` and a positive `fulfilledQuantity`.
`refundedQuantity` counts fulfilled units neutralized without a return, while `returnedQuantity`
counts returned fulfilled units. A unit must never be counted in both values. All quantities are
non-negative integers and the database enforces:

```text
refundedQuantity + returnedQuantity <= fulfilledQuantity
```

The retained eligible quantity is:

```text
fulfilledQuantity - refundedQuantity - returnedQuantity
```

The result qualifies only when that value is greater than zero. PostgreSQL CHECK constraints also
keep fulfillment state, timestamps, and quantities consistent. Explicit indexes support the
Customer/Order-status and Order/Variant eligibility paths. Foreign keys from `Order` to `Customer`
and from `OrderItem` to `Order` and `ProductVariant` use restrictive deletion so purchase-history
facts cannot disappear through cascading deletion.

The additive migration is
`apps/api/prisma/migrations/20261127120000_add_orders_and_order_items/migration.sql`; the Prisma
models in `apps/api/prisma/schema.prisma` and that reviewed SQL migration jointly own the persistent
contract.

## Internal eligibility boundary

`OrderModule` is registered in the API composition root and exports only
`PurchaseEligibilityService` for internal consumers. Its contract is:

```ts
canCustomerUsePurchasedProduct(
  customerId: string,
  productId: string,
): Promise<boolean>
```

The service rejects non-canonical UUID inputs before persistence access. `OrderRepository` runs one
parameterized `EXISTS` query joining `Order`, `OrderItem`, and `ProductVariant`; it returns only a
boolean and never exposes private order data. Lifecycle and retained-quantity arithmetic belong to
this Order boundary and must not be copied into Rating or Review.

## Consumer and security rules

- Rating and Review depend one-way on `PurchaseEligibilityService`; they do not query Order models
  directly and never create or mutate Order facts.
- `customerId` comes only from the authenticated session. `productId` comes from canonical,
  Backend-validated input.
- Every Rating or Review create/update rechecks current eligibility inside its write service
  immediately before persistence. A prior response or cached result is not durable authorization.
- Authenticated eligibility reads use the same service. Public Product cache, Client state,
  favorites, views, and cart data are never evidence of purchase or authorization.
- The Order slice has no HTTP contract, so it adds no Swagger/OpenAPI surface. Future Rating and
  Review endpoints document their own authenticated reads and writes.

## Validation evidence

`apps/api/test/order-purchase-eligibility.integration.test.ts` is the focused PostgreSQL integration
suite. It covers database quantity/state constraints and restrictive referential actions, as well as
eligible purchases, wrong Customer/Product, non-final states, zero fulfillment, full and partial
refund/return, multiple Orders/Items, multiple Variants, malformed identifiers, and boolean-only
service output.

## Ownership and future work

A separately approved Commerce implementation must own the production writer. Checkout may create a
pending Order, and the Order domain may change statuses, `fulfilledAt`, and quantity fields only from
authoritative Payment and fulfillment/refund/return outcomes inside database transactions while
preserving the constraints above. Rating, Review, Storefront, and Client code remain consumers only.

