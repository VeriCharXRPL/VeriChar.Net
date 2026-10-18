# Multi-Tenant XRPL API Design

## Purpose and protocol boundary

This document recommends an API-layer design for a multi-tenant SaaS that interacts with the XRP Ledger (XRPL) Testnet and Mainnet.

XRPL defines ledger networks, accounts, cryptographic transaction signing, consensus, and APIs for querying the ledger and submitting transactions. It does **not** define SaaS tenants, company authentication, tenant-level permissions, or isolation of an application's off-ledger data. Those responsibilities belong to this service.

The current backend is Testnet-only. Its initial HTTP API foundation provides a public health check, token-bound tenant context, and authenticated Testnet account reads. The public site can call the health check only; it does not receive a bearer token, and its donation demo remains simulated. The backend does not yet provide persistent tenant-owned application data, transaction submission, OAuth, or Mainnet. Adding those capabilities requires explicit application and operational controls; they are not enabled merely by using XRPL addresses or signing transactions.

## Recommended API shape

Use one service API origin and represent the XRPL network explicitly in XRPL-facing routes:

```http
POST /v1/networks/testnet/payments
Authorization: Bearer <access-token>
Idempotency-Key: <unique-request-key>
Content-Type: application/json
```

The corresponding Mainnet route is `/v1/networks/mainnet/payments`. The route's network is an application-level selection. The API maps it to a configured XRPL endpoint and never accepts an arbitrary XRPL server URL from a normal API request.

Do not use an XRPL `api_version` value to indicate a tenant or network. That field selects the version of the XRPL server API, not an application environment.

## Company authentication and authorization

1. For a production service, authenticate integrations using OAuth 2.0 client credentials and short-lived bearer access tokens. Use OIDC authorization code with PKCE for interactive user sign-in where needed. The initial backend foundation instead uses statically configured, high-entropy bearer tokens stored as SHA-256 hashes; this is a bootstrap mechanism, not a replacement for a managed identity provider, credential lifecycle, or OAuth.
2. Bind each identity to a tenant using a trusted token claim such as `tid`. Include narrowly scoped permissions, for example `payments:read`, `payments:write`, and `network:mainnet`.
3. Derive tenant context only from a verified identity. Do not accept `X-Tenant-ID` or a request-body tenant field as an authorization source.
4. Grant Mainnet access separately and explicitly. A tenant authorized for Testnet must not implicitly be authorized for Mainnet.
5. Apply role and scope checks to sensitive operations, including transaction submission, user administration, and credential management.

If an administrative route includes a tenant ID in its path, verify that the authenticated identity is authorized for that tenant. For ordinary tenant-owned resources, prefer deriving the tenant from the token rather than requiring a caller-supplied tenant path.

XRPL transaction signatures authorize XRPL accounts according to ledger rules. They do not authenticate a SaaS company or prove that the caller owns a tenant. The service must separately authorize the caller and verify that submitted transaction contents are permitted for that caller.

## Tenant data isolation

Enforce tenant ownership across every service boundary:

- Carry validated tenant context explicitly from the API boundary through application services and data-access code.
- Store a tenant ID on every tenant-owned record. Include tenant ID in database reads, updates, deletes, and uniqueness constraints. Where supported, use composite foreign keys and database row-level security as defense in depth.
- Scope cache keys, object-storage paths, queued work, audit events, idempotency keys, and rate limits by tenant. Background jobs must use validated tenant context and must not trust a tenant ID supplied only in an untrusted message.
- Check authorization whenever a resource is accessed, including when the resource ID is known. Never treat an unguessable ID as sufficient authorization.
- Deny access by default. Use consistent error behavior that does not reveal whether another tenant's resource exists.
- Test cross-tenant read, update, delete, transaction submission, cache, and background-job cases.

XRPL ledger data itself is shared and public on each network; tenant isolation applies to this service's private application data, credentials, and authorization—not to private copies of public ledger state.

## Testnet and Mainnet handling

Use an explicit network selector for each XRPL operation. Configure the allowed XRPL endpoints server-side, and route Testnet and Mainnet through separate client configuration. Never silently default a transaction request to Mainnet.

Treat Mainnet operations as higher risk:

- Require a distinct Mainnet permission and, where appropriate, stronger approval or transaction limits.
- Keep Mainnet signing credentials separate from Testnet credentials.
- Do not expose secret keys in API responses or logs. If the service signs transactions, protect keys with an appropriate managed secure signing system. If clients sign, verify the transaction's signer, account, contents, and intended network before submission.
- Track the selected network alongside every transaction, submission result, idempotency record, and audit event.

Separate API hostnames may be added as an operational safeguard, but they do not replace tenant or network authorization checks. Separate service credentials can reduce blast radius only when they represent genuinely distinct identities and permissions.

## Transaction lifecycle and operational behavior

Treat transaction submission as asynchronous. A successful submit response does not necessarily mean the transaction is included in a validated ledger. Return a service-level submission resource and report status transitions such as `pending`, `validated`, or `failed`, with the network and XRPL transaction hash.

Support idempotency for transaction-creating operations. Scope idempotency keys by tenant and network, and store enough request/result state to return a consistent response for retries without submitting an unintended duplicate.

Record security-sensitive actions and transaction submission attempts with tenant, actor, network, and transaction identifiers. Never log bearer tokens, seed phrases, private keys, or signing secrets. Apply per-tenant quotas and rate limits, with stricter controls available for Mainnet.

## Decisions to confirm

These are product and architecture choices that cannot be settled by the XRPL protocol:

| Decision | Recommended starting point | Trade-off |
|---|---|---|
| Who signs transactions? | Prefer client-held signing keys if the product can support it; if the service signs, use managed secure key custody and keep network credentials separate. | Client-side signing reduces service custody risk but adds client integration complexity. Service-side signing simplifies workflows but creates significant key-management, security, and compliance responsibilities. |
| Can one user belong to multiple tenants? | Model users, tenant memberships, and service clients separately; authorize each request against an active membership or client-to-tenant binding. | Supports agencies and shared operators but requires explicit tenant selection for interactive sessions and careful membership checks. |
| Which networks are supported? | Enable Testnet first; make Mainnet opt-in per tenant after explicit authorization and operational readiness. | Mainnet access provides production capability but increases financial and support risk. Testnet availability and state may be less stable than Mainnet. |
| Can tenants configure their own XRPL endpoints? | Not in ordinary transaction requests. If required, offer a privileged, validated administrative setting. | Custom endpoints offer provider choice but add SSRF, availability, correctness, and support risks. |

## XRPL references

- [HTTP / WebSocket APIs](https://xrpl.org/docs/references/http-websocket-apis)
- [Request formatting](https://xrpl.org/docs/references/http-websocket-apis/api-conventions/request-formatting)
- [Parallel networks](https://xrpl.org/docs/concepts/networks-and-servers/parallel-networks)
- [Transactions](https://xrpl.org/docs/concepts/transactions)
- [Secure signing](https://xrpl.org/docs/concepts/transactions/secure-signing)
