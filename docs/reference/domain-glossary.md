---
title: Gold Pasal domain glossary
description: The shared language used by the store, API, tests, and lessons.
---

# Gold Pasal domain glossary

Use these terms consistently in code, tests, diagrams, and conversation.

## Jewelry and pricing

**Tola**  
A South Asian unit of mass. Gold Pasal uses the fixed conversion `1 tola = 11.6638038 grams`. Store calculations use grams internally and show tola at the boundary.

**Karat**  
Gold purity measured out of 24 parts. `24K` is treated as pure gold for the course formula; `22K` has a purity factor of `22 / 24`. Karat is not the same as the gemstone unit “carat.”

**Fine-gold weight**  
The equivalent mass of pure gold in an item: gross gold weight multiplied by its purity factor.

**Reference gold rate**  
The market rate used as an input to a quote. A quote records the rate it used; changing today’s rate never rewrites an old quote.

**Wastage charge**  
A transparent percentage applied by a pricing policy to account for production loss. It is a pricing input, not hidden extra weight.

**Making charge**  
The labor/design charge. A policy may calculate it per gram or as a fixed amount.

**Quote**  
An immutable price explanation for one item at one point in time. It is not an inventory reservation or an order.

## Catalog and inventory

**SKU**  
A stable stock-keeping identifier for a sellable design/variation.

**Stock item**  
One uniquely identified physical piece. Quantity-based stock can be an elective; the core jewelry flow reserves serialized pieces.

**Available**  
The item is neither sold nor covered by an active hold.

**Hold**  
A temporary claim on an available item until a recorded expiry. A hold prevents a competing order but does not itself mean a sale.

**Reservation conflict**  
The expected business result when two actors try to hold the same item and only one can succeed.

## Orders and operations

**Order**  
A durable purchase record created from an active hold.

**Idempotency key**  
A client-provided identifier that lets a retried write return the original result instead of applying twice.

**Audit event**  
An append-only record of who attempted or performed a sensitive action, when, and against which entity.

**Release evidence**  
An inspectable commit, PR, CI run, deployment, ADR, runbook, or demo that proves a capability. Reading a page is not release evidence.

## AI systems

**Model adapter**  
A boundary that hides provider-specific model calls from the application.

**Tool**  
A typed operation an agent may request. A tool validates input and calls the existing application API; it does not reimplement store rules.

**Trajectory**  
The ordered observations, decisions, tool calls, and results from one agent run.

**MCP server**  
A process that exposes tools, resources, or prompts through the Model Context Protocol. Gold Pasal starts with local stdio transport.
