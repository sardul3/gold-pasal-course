---
id: r5-04
title: "Model the order state machine"
release: r5
order: 4
prerequisites: [r5-03]
outcomes:
  - Define OrderStatus and the legal transitions as data
  - Write a transition function that returns a new Order or raises InvalidTransitionError
  - Test every legal and illegal move without a database
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="An order will be pending, then paid, sometimes cancelled. If those words live in if-statements scattered across routes, a refund will one day set a paid order back to pending and nobody will notice."
  destination="A frozen Order, an OrderStatus enum, a transitions table, and one transition() function; illegal moves raise before any row changes."
/>

# Model the order state machine

A **state machine** is a small model: a set of states, and which moves between them are legal. An order is pending, then paid or cancelled, and a paid order stays paid. Writing that as data, not as conditions inside handlers, means the rule is in one place and tests can walk every edge in milliseconds.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from enum import StrEnum
>>> class OrderStatus(StrEnum):
...     PENDING_PAYMENT = "pending_payment"
...     PAID = "paid"
...     CANCELLED = "cancelled"
...
>>> TRANSITIONS = {
...     OrderStatus.PENDING_PAYMENT: frozenset({OrderStatus.PAID, OrderStatus.CANCELLED}),
...     OrderStatus.PAID: frozenset(),
...     OrderStatus.CANCELLED: frozenset(),
... }
>>> OrderStatus.PAID in TRANSITIONS[OrderStatus.PENDING_PAYMENT]
True
>>> OrderStatus.CANCELLED in TRANSITIONS[OrderStatus.PAID]
False
```

The whole business rule is that dict. Everything else on the page is making it hard to bypass.

## The module

Add to `src/gold_pasal/errors.py`:

```python
class OrderError(Exception):
    """Base class for checkout failures."""


class InvalidTransitionError(OrderError):
    def __init__(self, current: str, target: str) -> None:
        super().__init__(f"an order cannot go from {current} to {target}")


class UnknownOrderError(OrderError, LookupError):
    def __init__(self, order_id: str) -> None:
        super().__init__(f"no order {order_id!r}")
```

Create `src/gold_pasal/orders.py`:

```python
"""Orders: the state machine, the checkout service, and the ports it needs."""

from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum

from gold_pasal.errors import InvalidTransitionError


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    CANCELLED = "cancelled"


TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING_PAYMENT: frozenset({OrderStatus.PAID, OrderStatus.CANCELLED}),
    OrderStatus.PAID: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}


@dataclass(frozen=True)
class Order:
    order_id: str
    hold_id: str
    stock_item_id: str
    sku: str
    customer: str
    payment_reference: str
    status: OrderStatus
    created_at: datetime


def transition(order: Order, target: OrderStatus) -> Order:
    """Move an order to a new status, or raise InvalidTransitionError."""
    if target not in TRANSITIONS[order.status]:
        raise InvalidTransitionError(order.status.value, target.value)
    return replace(order, status=target)
```

### Reading it

`OrderStatus` is a `StrEnum` ([R1](/releases/r1/03-classes-dataclasses-and-enums)), so `OrderStatus("paid")` parses what the database stores and `OrderStatus.PAID == "paid"` is true for the JSON the API returns.

`TRANSITIONS` maps each state to the set of states it may move to. `frozenset()` for `PAID` and `CANCELLED` says they are terminal. Adding a `REFUNDED` state later is a new enum member and a new entry, in this file, and the tests below tell you which moves you forgot to decide.

`Order` is frozen. `transition` does not mutate; it returns a copy with the new status via `dataclasses.replace`, exactly like `Money.rounded()` in R2. An `Order` object you hold cannot change under you.

`Order` has no amount. The checkout body in this release carries a `payment_reference` from a provider that already knows the price; the quote total joins the order in a later release when checkout accepts a quote id. Recording a `sku` and `stock_item_id` is enough to answer "what was sold".

## Try the edges

```python
>>> from datetime import UTC, datetime
>>> from gold_pasal.orders import Order, OrderStatus, transition
>>> pending = Order("order-1", "hold-1", "GP-N-0001", "GP-NECKLACE-0001", "customer",
...                 "stub-0001", OrderStatus.PENDING_PAYMENT, datetime(2026, 9, 21, 10, tzinfo=UTC))
>>> paid = transition(pending, OrderStatus.PAID)
>>> paid.status, pending.status
(<OrderStatus.PAID: 'paid'>, <OrderStatus.PENDING_PAYMENT: 'pending_payment'>)
>>> transition(paid, OrderStatus.CANCELLED)
Traceback (most recent call last):
  ...
gold_pasal.errors.InvalidTransitionError: an order cannot go from paid to cancelled
```

`pending` is unchanged after the transition. A paid order cannot be cancelled here: a refund is a different business process with its own state, and the model refuses to pretend otherwise until someone designs it.

## Tests

Create `tests/unit/orders/test_state_machine.py`:

```python
from datetime import UTC, datetime

import pytest

from gold_pasal.errors import InvalidTransitionError
from gold_pasal.orders import Order, OrderStatus, transition

PENDING = Order(
    order_id="order-0001",
    hold_id="hold-0001",
    stock_item_id="GP-N-0001",
    sku="GP-NECKLACE-0001",
    customer="customer",
    payment_reference="stub-0001",
    status=OrderStatus.PENDING_PAYMENT,
    created_at=datetime(2026, 9, 21, 10, 0, tzinfo=UTC),
)


def test_pending_can_be_paid() -> None:
    paid = transition(PENDING, OrderStatus.PAID)

    assert paid.status is OrderStatus.PAID
    assert PENDING.status is OrderStatus.PENDING_PAYMENT


def test_pending_can_be_cancelled() -> None:
    assert transition(PENDING, OrderStatus.CANCELLED).status is OrderStatus.CANCELLED


@pytest.mark.parametrize("terminal", [OrderStatus.PAID, OrderStatus.CANCELLED])
def test_terminal_states_do_not_move(terminal: OrderStatus) -> None:
    order = transition(PENDING, terminal)

    with pytest.raises(InvalidTransitionError):
        transition(order, OrderStatus.PENDING_PAYMENT)


def test_paid_cannot_be_cancelled_here() -> None:
    with pytest.raises(InvalidTransitionError, match="paid to cancelled"):
        transition(transition(PENDING, OrderStatus.PAID), OrderStatus.CANCELLED)
```

```bash
uv run pytest tests/unit/orders -q
```

```text
.....                                                                    [100%]
5 passed in 0.02s
```

`PENDING` is a module-level constant and the tests still cannot corrupt it: frozen dataclasses make shared fixtures safe. The parametrized test walks both terminal states with one function.

## Why data, not conditions

Compare with the alternative that grows in every codebase:

```python
# in one route
if order.status == "pending_payment":
    order.status = "paid"
# in another, months later
if order.status in ("pending_payment", "paid"):
    order.status = "cancelled"     # oops: a paid order is now cancelled
```

Each route encodes its own idea of the rules, and no test covers the interaction. With `TRANSITIONS` and `transition`, every route calls the same function, the function reads the same table, and four unit tests pin the table. R11's agent, which will try to move orders around through tools, meets the same wall.

The hold already has this shape: `HoldStatus` in R4 with `ACTIVE`, `EXPIRED`, `CONSUMED`. The next page moves a hold from `ACTIVE` to `CONSUMED` and an order from `PENDING_PAYMENT` to `PAID` in the same transaction.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `KeyError: <OrderStatus.X>` in `transition` | A new status missing from `TRANSITIONS` | Every member needs an entry, even `frozenset()` |
| `FrozenInstanceError` | Assigned `order.status = ...` | Use `transition`, which uses `replace` |
| `ValueError: 'PAID' is not a valid OrderStatus` | Parsed the member name instead of the value | Store and parse `"paid"`, the value |
| Test imports fail with `import file mismatch` | Two test files with the same basename | Unique names across `tests/` |

## Practice

<LessonQuiz
  question="The shop adds REFUNDED. What is the complete change to the state machine?"
  a="A new if in the refund route"
  b="A new OrderStatus member, a TRANSITIONS entry for it, and PAID's set gains REFUNDED; then the tests that walk the table"
  c="A database migration only"
  d="Nothing; transition accepts any target"
  correct="b"
>

States and legal moves live in the enum and the table. The refund route calls `transition(order, OrderStatus.REFUNDED)` and gets the rule for free; the migration is about storage, not about which moves are legal.

</LessonQuiz>

Next: [Turn a hold into an order](05-turn-a-hold-into-an-order).

<EvidenceCard
  command="uv run pytest tests/unit/orders -q"
  artifact="orders.py with OrderStatus, TRANSITIONS, Order, transition; five state-machine tests"
  invariant="An order changes status only through transition(), which reads one table of legal moves"
/>
