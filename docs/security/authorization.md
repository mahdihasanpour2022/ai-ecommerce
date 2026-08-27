# Authorization

## Model

Use backend-enforced role-based access control (RBAC) for the independent Admin identity model. `AdminUser` has a conceptual many-to-many relationship with `Role`; `Role` has a conceptual many-to-many relationship with `Permission`. `SUPER_ADMIN` is a special Role, not an `isSuperAdmin` boolean. Protected endpoints evaluate the required action and, when necessary, resource context. Default-deny is preferred: no protected operation is allowed merely because a route or button exists.

Conceptual roles, subject to approval, are `SUPER_ADMIN`, `ADMIN`, `PRODUCT_MANAGER`, and `ORDER_MANAGER`. Example permissions include:

```text
product.read       product.create       product.update       product.delete
inventory.read     inventory.update
order.read         order.update
user.read          user.create          user.update
role.manage
```

These examples are not the final permission matrix. Avoid relying only on role names once granular capabilities or resource scope are required.

## Enforcement rules

- UI visibility improves usability but is not authorization.
- Backend guards/policies enforce permissions for every protected operation; services also preserve invariants when invoked outside HTTP controllers.
- Authentication failures return stable `401` codes; an authenticated identity lacking permission returns `403 INSUFFICIENT_PERMISSION` without triggering refresh. User-display messages are Persian.
- Response filtering and resource scoping prevent data disclosure, not only writes.
- Role, permission, and Admin status changes must be enforceable without waiting for a long-lived JWT authorization snapshot to expire. Access tokens may identify the Admin/session, while the Backend remains capable of resolving current status and authorization. Caching is Deferred until measurement justifies it.
- Disabling an `AdminUser` causes protected calls from all of that Admin's independent sessions to fail with `401 ACCOUNT_DISABLED` even if their access JWTs have not naturally expired. Normal logout still revokes only one current session.
- Privilege assignment, account changes, destructive catalog operations, inventory changes, and other sensitive actions should be auditable when audit scope is approved.
- Never trust client-supplied role, permission, ownership, price, or inventory claims.

## Open decisions

Approve the final role-permission matrix, resource scopes, super-admin safeguards, separation-of-duties requirements, role assignment workflow, audit events/retention, and emergency access before the relevant functionality. Customer identity/authentication is separate and Deferred.
