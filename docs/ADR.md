# Architecture Decision Records (ADR)

---

## ADR-001: PostgreSQL as the Primary Database

**Date:** 2026-10-07  
**Status:** Accepted

### Context
SALESTORM needs to manage inventory for flash sales where hundreds of users attempt to purchase the same item within seconds. The core requirement is that inventory counts are always accurate — no item should be sold that doesn't exist.

### Decision
Use **PostgreSQL** as the sole database.

### Rationale

| Property | PostgreSQL | Alternative (MongoDB/Redis) |
|---|---|---|
| **ACID transactions** | ✅ Full — atomicity guaranteed | ⚠️ Partial or eventual |
| **Row-level locking** | ✅ `SELECT FOR UPDATE` | ❌ Not available |
| **Foreign keys** | ✅ Enforced at DB level | ❌ Application-enforced only |
| **Complex queries** | ✅ JOINs across entities | ⚠️ Requires multiple round-trips |
| **Consistency model** | Strong | Eventual |

### Consequences
- **Positive:** Inventory is always consistent; no overselling is possible at the DB level.
- **Negative:** Horizontal write scaling is harder than NoSQL. Under extreme load, a single write-primary becomes a bottleneck.
- **Mitigation:** Row-level (not table-level) locking minimises contention. Read replicas handle GET-heavy traffic.

---

## ADR-002: Pessimistic Row Locking (`SELECT FOR UPDATE`) for Inventory

**Date:** 2026-10-07  
**Status:** Accepted

### Context
A flash sale creates a burst of concurrent `reserve` requests. Without coordination, two concurrent transactions could both read `availableQuantity = 1`, both pass the `>= 1` check, and both decrement — resulting in `availableQuantity = -1` (oversell).

### Decision
Lock the `Inventory` row with `SELECT ... FOR UPDATE` inside every reserve and release transaction.

### How it works
```
Transaction A                     Transaction B
BEGIN;                            BEGIN;
SELECT FOR UPDATE → gets lock     SELECT FOR UPDATE → WAITS
CHECK qty >= 1  → true
UPDATE qty = qty - 1
COMMIT; → releases lock                         → unblocked
                                  SELECT FOR UPDATE → gets lock
                                  CHECK qty >= 1 → false → ROLLBACK
                                  → 409 returned to client
```

### Alternatives Considered
| Approach | Reason Rejected |
|---|---|
| **Optimistic locking** (version check) | Requires retries on conflict — adds complexity and may fail under sustained load |
| **Application mutex** (in-memory lock) | Breaks with multiple Node.js instances |
| **Redis DECR** | Requires an additional service; adds operational overhead |

### Consequences
- **Positive:** Overselling is mathematically impossible. Simple to reason about.
- **Negative:** Transactions serialise per product — high contention for a single hot product.
- **Mitigation:** The lock is held only for the duration of the transaction (< 5ms typical). Under extreme load, a queue (BullMQ) can be introduced to decouple burst requests from DB writes.

---

## ADR-003: Idempotency Keys on Reserve and Payment APIs

**Date:** 2026-10-07  
**Status:** Accepted

### Context
Network failures, client retries, and UI double-clicks mean the same logical operation may arrive at the server more than once. Without safeguards, each arrival would create a new reservation or charge the customer twice.

### Decision
All mutating endpoints (`/reserve`, `/payments`) require a client-supplied `idempotencyKey`. The key is stored with a `UNIQUE` constraint. Duplicate requests return the original response without re-executing.

### How it works
```
1. Client generates idempotencyKey = uuid() before sending request.
2. Server: SELECT WHERE idempotencyKey = ?
   - Found → return existing record (HTTP 200, idempotent: true)
   - Not found → execute operation, store record with key
3. On retry: same key → same result, no side effects.
```

### Consequences
- **Positive:** Safe retries at zero cost. Protects inventory and billing from duplicate writes.
- **Negative:** Clients must generate and manage keys. Keys are stored permanently (no TTL currently).
- **Future:** Add a TTL/expiry to idempotency keys to prevent unbounded table growth.
