# Business Entities

<cite>
**Referenced Files in This Document**
- [reward.schema.ts](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts)
- [challenge-rules-eval.ts](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts)
- [plan.schema.ts](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts)
- [subscription.schema.ts](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts)
- [payment.schema.ts](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts)
- [challenge.schema.ts](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts)
- [plan.types.ts](file://backend/apps/api/src/modules/plans/domain/plan.types.ts)
- [kyc-application.schema.ts](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts)
- [kyc-state.ts](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts)
- [audit-log.schema.ts](file://backend/libs/shared/src/audit/audit-log.schema.ts)
- [payment.port.ts](file://backend/apps/api/src/modules/plans/infrastructure/payment/payment.port.ts)
- [razorpay.provider.ts](file://backend/apps/api/src/modules/plans/infrastructure/payment/razorpay.provider.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides detailed data model documentation for the core business entities: Challenges, Rewards, Plans, Subscriptions, Payments, and KYC Applications. It explains schemas, state transitions, business rules, audit requirements, and privacy considerations for sensitive data such as KYC documents and payment information. The goal is to make the system understandable for both technical and non-technical readers while remaining grounded in the actual codebase.

## Project Structure
The relevant entities are implemented across feature modules with a consistent layered structure:
- Domain types and pure logic (e.g., plan states, challenge evaluation)
- Infrastructure schemas (Mongoose models)
- Application services that orchestrate workflows
- Presentation controllers and DTOs for APIs

```mermaid
graph TB
subgraph "Plans Module"
P_PLAN["Plan Schema"]
P_SUB["Subscription Schema"]
P_PAY["Payment Schema"]
P_CHALL["Challenge Schema"]
P_TYPES["Plan Types (Statuses, Rules)"]
end
subgraph "Challenge & Reward Module"
C_RULES["Challenge Rules Evaluation"]
C_REWARD["Reward Schema"]
end
subgraph "KYC Module"
K_APP["KYC Application Schema"]
K_STATE["KYC State Machine"]
end
subgraph "Shared Audit"
A_LOG["Audit Log Schema"]
end
P_PLAN --> P_CHALL
P_PAY --> P_SUB
P_CHALL --> C_REWARD
C_RULES --> P_CHALL
K_STATE --> K_APP
A_LOG -.-> P_PAY
A_LOG -.-> K_APP
```

**Diagram sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [plan.types.ts:22-48](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L22-L48)
- [challenge-rules-eval.ts:35-66](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts#L35-L66)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)
- [kyc-state.ts:3-17](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L3-L17)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

**Section sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [plan.types.ts:22-48](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L22-L48)
- [challenge-rules-eval.ts:35-66](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts#L35-L66)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)
- [kyc-state.ts:3-17](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L3-L17)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

## Core Components
- Plan: Defines subscription tiers, pricing, virtual capital, and rule sets governing challenges.
- Challenge: An instance of a plan with snapshotted rules and live tracking fields for equity, peak equity, daily start equity, realized PnL, trading days, and status.
- Subscription: Links a user to a plan via a payment, with activation and expiry dates and lifecycle status.
- Payment: Records transaction intent, gateway identifiers, idempotency keys, and outcomes; integrates with a pluggable payment provider.
- Reward: Tracks gamification payouts tied to passed challenges, including computed amounts, admin overrides, and timeline events.
- KYC Application: Manages identity verification with encrypted PAN, document references, reviewer info, and a strict state machine.

**Section sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)

## Architecture Overview
The system separates domain logic from persistence and integration points:
- Domain layer defines immutable types and pure functions (e.g., challenge evaluation).
- Infrastructure layer persists data via Mongoose schemas and integrates with external providers (e.g., Razorpay).
- Shared audit logging ensures compliance and traceability for financial and identity-related actions.

```mermaid
sequenceDiagram
participant User as "User"
participant API as "API Layer"
participant PayProv as "Payment Provider"
participant DB as "Database"
participant Audit as "Audit Log"
User->>API : "Create payment intent"
API->>PayProv : "createOrder(amountPaise, currency, receipt)"
PayProv-->>API : "gatewayOrderId, publicKey"
API->>DB : "Persist Payment (CREATED)"
Note over API,DB : "Idempotency key prevents duplicate activation"
User->>API : "Submit checkout signature"
API->>PayProv : "verifyCheckoutSignature(orderId, paymentId, signature)"
PayProv-->>API : "verified"
API->>DB : "Update Payment (CAPTURED -> ACTIVATED)"
API->>DB : "Create Subscription (ACTIVE)"
API->>DB : "Create Challenge (PENDING)"
API->>Audit : "Record activation event"
```

**Diagram sources**
- [payment.port.ts:20-32](file://backend/apps/api/src/modules/plans/infrastructure/payment/payment.port.ts#L20-L32)
- [razorpay.provider.ts:27-45](file://backend/apps/api/src/modules/plans/infrastructure/payment/razorpay.provider.ts#L27-L45)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

## Detailed Component Analysis

### Challenge Entity
- Purpose: Represents a user’s active trading challenge governed by a snapshot of plan rules.
- Key fields:
  - userId, planId, planVersion, planName
  - Snapshotted rules: profitTargetPct, maxDrawdownPct, dailyDrawdownPct, drawdownAnchor, minTradingDays, expiryDays, rewardPct, segments
  - Live metrics: equityPaise, peakEquityPaise, dayStartEquityPaise, realizedPnlPaise, tradingDays
  - Lifecycle: status (PENDING, ACTIVE, PASSED_PENDING_REVIEW, PASSED, FAILED, EXPIRED), startedAt, endsAt, events
- Business rules:
  - Challenge evaluation order: daily drawdown → max drawdown → expiry → profit target with minimum trading days.
  - Reward computation uses net profit above capital and configured reward percentage.
- Indices: userId+status, status+endsAt for efficient queries.

```mermaid
flowchart TD
Start(["Evaluate Challenge"]) --> DailyDD["Check daily drawdown floor"]
DailyDD --> |Breach| FailDaily["FAIL: DAILY_DRAWDOWN"]
DailyDD --> |OK| MaxDD["Check max drawdown floor"]
MaxDD --> |Breach| FailMax["FAIL: MAX_DRAWDOWN"]
MaxDD --> |OK| Expired{"Expired?"}
Expired --> |Yes| FailExp["FAIL: EXPIRED"]
Expired --> |No| Profit{"Reached profit target AND min trading days?"}
Profit --> |Yes| Pass["PASS"]
Profit --> |No| Continue["CONTINUE"]
```

**Diagram sources**
- [challenge-rules-eval.ts:35-66](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts#L35-L66)

**Section sources**
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [challenge-rules-eval.ts:35-66](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts#L35-L66)
- [plan.types.ts:41-48](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L41-L48)

### Reward Entity
- Purpose: Captures gamification payout eligibility and outcomes for passed challenges.
- Key fields:
  - challengeId, userId
  - rewardPct, computedAmountPaise (system-computed at pass time), optional overrideAmountPaise (admin override)
  - status: ELIGIBLE, APPROVED, REJECTED, PAID
  - reviewerId, decisionReason
  - timeline: timestamped events with actor and notes
- Validation and workflow:
  - Status progression enforced by application logic; timeline records all changes for auditability.
  - Admin can override payout amount; final payout marked PAID when completed off-platform.

```mermaid
stateDiagram-v2
[*] --> ELIGIBLE
ELIGIBLE --> APPROVED : "Admin approve"
ELIGIBLE --> REJECTED : "Admin reject"
APPROVED --> PAID : "Mark paid"
REJECTED --> [*]
PAID --> [*]
```

**Diagram sources**
- [reward.schema.ts:4-9](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L4-L9)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)

**Section sources**
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [challenge-rules-eval.ts:62-66](file://backend/apps/api/src/modules/challenge/domain/challenge-rules-eval.ts#L62-L66)

### Plan Entity
- Purpose: Defines subscription tiers with pricing, virtual capital, and rule sets.
- Key fields:
  - name, slug (unique), description
  - pricePaise (integer paise), virtualCapitalPaise (integer paise)
  - rules: profitTargetPct, maxDrawdownPct, dailyDrawdownPct, drawdownAnchor, minTradingDays, expiryDays, rewardPct, segments
  - status: ACTIVE, ARCHIVED
  - version bumped on edits; challenges snapshot version at creation
  - displayOrder for catalog ordering
- Business rules:
  - Rule set governs challenge evaluation; editing plans does not affect running challenges due to snapshots.
  - Segments restrict allowed instrument types (EQ, FO, CUR).

```mermaid
classDiagram
class Plan {
+string name
+string slug
+string description
+number pricePaise
+number virtualCapitalPaise
+RulesSubdoc rules
+PlanStatus status
+number version
+number displayOrder
}
class RulesSubdoc {
+number profitTargetPct
+number maxDrawdownPct
+number dailyDrawdownPct
+string drawdownAnchor
+number minTradingDays
+number expiryDays
+number rewardPct
+string[] segments
}
Plan --> RulesSubdoc : "has"
```

**Diagram sources**
- [plan.schema.ts:5-16](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L5-L16)
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [plan.types.ts:1-20](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L1-L20)

**Section sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [plan.types.ts:1-20](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L1-L20)

### Subscription Entity
- Purpose: Tracks an active subscription linked to a plan and payment, with lifecycle management.
- Key fields:
  - userId, planId, challengeId, paymentId
  - status: ACTIVE, EXPIRED, CANCELLED
  - activatedAt, expiresAt
- Business rules:
  - Created upon successful payment activation; expiration derived from plan rules.
  - Indexed for fast lookup by user and status; expiresAt used for cleanup or renewal checks.

```mermaid
sequenceDiagram
participant User as "User"
participant API as "API"
participant DB as "Database"
User->>API : "Activate subscription after payment"
API->>DB : "Create Subscription (ACTIVE)"
API->>DB : "Set activatedAt, expiresAt"
API->>DB : "Link paymentId, planId, challengeId"
Note over API,DB : "Ensure exactly-once via idempotency"
```

**Diagram sources**
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [payment.schema.ts:35-40](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L35-L40)

**Section sources**
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [plan.types.ts:35-39](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L35-L39)

### Payment Entity
- Purpose: Records transaction intent, gateway interactions, and outcomes with strong idempotency guarantees.
- Key fields:
  - userId, planId, amountPaise, currency (default INR)
  - status: CREATED, CAPTURED, ACTIVATED, FAILED, REFUNDED
  - provider, gatewayOrderId (unique), gatewayPaymentId, gatewayRefundId
  - idempotencyKey (unique) to ensure exactly-once capital crediting
  - Optional links to subscriptionId and challengeId
  - failureReason, refundReason, lastWebhookMeta
- Integration:
  - Pluggable provider interface abstracts gateway specifics; Razorpay implementation handles order creation, signature verification, webhook verification, and refunds.
  - Idempotency key prevents duplicate activations under concurrent webhooks and polling.

```mermaid
classDiagram
class Payment {
+ObjectId userId
+ObjectId planId
+number amountPaise
+string currency
+PaymentStatus status
+string provider
+string gatewayOrderId
+string gatewayPaymentId
+string gatewayRefundId
+string idempotencyKey
+ObjectId subscriptionId
+ObjectId challengeId
+string failureReason
+string refundReason
+Object lastWebhookMeta
}
class PaymentProvider {
+name string
+createOrder(amountPaise, currency, receipt) CreatedOrder
+verifyCheckoutSignature(orderId, paymentId, signature) boolean
+verifyWebhookSignature(rawBody, signature) boolean
+refund(gatewayPaymentId, amountPaise) RefundResult
}
Payment --> PaymentProvider : "uses"
```

**Diagram sources**
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [payment.port.ts:20-32](file://backend/apps/api/src/modules/plans/infrastructure/payment/payment.port.ts#L20-L32)
- [razorpay.provider.ts:12-45](file://backend/apps/api/src/modules/plans/infrastructure/payment/razorpay.provider.ts#L12-L45)

**Section sources**
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [payment.port.ts:20-32](file://backend/apps/api/src/modules/plans/infrastructure/payment/payment.port.ts#L20-L32)
- [razorpay.provider.ts:27-45](file://backend/apps/api/src/modules/plans/infrastructure/payment/razorpay.provider.ts#L27-L45)
- [plan.types.ts:27-33](file://backend/apps/api/src/modules/plans/domain/plan.types.ts#L27-L33)

### KYC Application Entity
- Purpose: Manages identity verification workflows with secure document storage and strict state transitions.
- Key fields:
  - userId, status: SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
  - panNumberEnc: field-encrypted PAN (AES-256-GCM), excluded from default selects
  - documents: array of KycDocumentRef entries with type, fileKey, mimeType, sizeBytes
  - reviewerId, rejectionReason
  - timeline: timestamped events with actor and notes
- State machine:
  - SUBMITTED -> UNDER_REVIEW (CLAIM)
  - UNDER_REVIEW -> APPROVED (APPROVE) or REJECTED (REJECT)
  - Terminal states: APPROVED, REJECTED
- Privacy:
  - Documents stored as encrypted blobs; only relative keys persisted in DB.
  - Allowed MIME types and maximum file size enforced by domain constants.

```mermaid
stateDiagram-v2
[*] --> SUBMITTED
SUBMITTED --> UNDER_REVIEW : "CLAIM"
UNDER_REVIEW --> APPROVED : "APPROVE"
UNDER_REVIEW --> REJECTED : "REJECT"
APPROVED --> [*]
REJECTED --> [*]
```

**Diagram sources**
- [kyc-state.ts:3-17](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L3-L17)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)

**Section sources**
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)
- [kyc-state.ts:3-17](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L3-L17)
- [kyc-state.ts:30-35](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L30-L35)

## Dependency Analysis
- Plan depends on domain types for statuses and rule definitions; challenges snapshot these rules at activation.
- Payment depends on a pluggable provider abstraction; Razorpay is one concrete implementation.
- Subscription depends on Payment and Plan to establish access rights and billing cycles.
- Reward depends on Challenge outcomes and plan-defined reward percentages.
- KYC Application is independent but often gated by approval for certain features.
- Audit Log is cross-cutting, recording actions across payments and KYC workflows.

```mermaid
graph LR
PLAN["Plan"] --> CHALLENGE["Challenge"]
PAYMENT["Payment"] --> SUBSCRIPTION["Subscription"]
CHALLENGE --> REWARD["Reward"]
PAYMENT --> AUDIT["Audit Log"]
KYC["KYC Application"] --> AUDIT
```

**Diagram sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

**Section sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

## Performance Considerations
- Indexing:
  - Payment: indexed by userId and createdAt; status+createdAt for filtering recent transactions.
  - Subscription: indexed by userId+status and expiresAt for quick lookups and expiry scans.
  - Challenge: indexed by userId+status and status+endsAt for lifecycle queries.
  - Reward: indexed by status+createdAt for admin review queues.
  - KYC: indexed by status+createdAt and a partial unique index on userId for live applications.
- Idempotency:
  - Payment idempotencyKey ensures exactly-once activation even under concurrent webhooks/polling.
- Pure evaluation:
  - Challenge evaluation is pure and deterministic, minimizing I/O during hot paths.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Payment failures:
  - Check Payment.status and failureReason; verify webhook signatures using provider methods.
  - Ensure idempotencyKey uniqueness to avoid duplicate activations.
- KYC stuck states:
  - Validate state transitions using the transition function; invalid actions will fail with domain errors.
  - Confirm document constraints (MIME types, size limits) before upload.
- Audit trail:
  - Review audit_logs for actorType, action, entity, entityId, before/after snapshots, and timestamps.

**Section sources**
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [razorpay.provider.ts:32-40](file://backend/apps/api/src/modules/plans/infrastructure/payment/razorpay.provider.ts#L32-L40)
- [kyc-state.ts:19-28](file://backend/apps/api/src/modules/kyc/domain/kyc-state.ts#L19-L28)
- [audit-log.schema.ts:7-34](file://backend/libs/shared/src/audit/audit-log.schema.ts#L7-L34)

## Conclusion
The data models for Challenges, Rewards, Plans, Subscriptions, Payments, and KYC Applications form a cohesive system supporting gamified trading challenges, subscription-based access, secure payments, and compliant identity verification. Strong state machines, pure evaluation logic, idempotent payment processing, and comprehensive audit logging ensure reliability, security, and regulatory readiness.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Data Models Diagram
```mermaid
erDiagram
PLAN {
string name
string slug UK
number pricePaise
number virtualCapitalPaise
string status
number version
}
CHALLENGE {
ObjectId userId
ObjectId planId
number planVersion
string planName
string status
datetime startedAt
datetime endsAt
}
SUBSCRIPTION {
ObjectId userId
ObjectId planId
ObjectId challengeId
ObjectId paymentId
string status
datetime activatedAt
datetime expiresAt
}
PAYMENT {
ObjectId userId
ObjectId planId
number amountPaise
string currency
string status
string provider
string gatewayOrderId UK
string gatewayPaymentId
string gatewayRefundId
string idempotencyKey UK
ObjectId subscriptionId
ObjectId challengeId
}
REWARD {
ObjectId challengeId
ObjectId userId
number rewardPct
number computedAmountPaise
number overrideAmountPaise
string status
ObjectId reviewerId
}
KYC_APPLICATION {
ObjectId userId
string status
string panNumberEnc
ObjectId reviewerId
}
PLAN ||--o{ CHALLENGE : "creates"
PLAN ||--o{ SUBSCRIPTION : "linked by"
PAYMENT ||--o{ SUBSCRIPTION : "activates"
CHALLENGE ||--o{ REWARD : "produces"
KYC_APPLICATION ||--o{ USER : "belongs to"
```

**Diagram sources**
- [plan.schema.ts:18-49](file://backend/apps/api/src/modules/plans/infrastructure/schemas/plan.schema.ts#L18-L49)
- [challenge.schema.ts:23-70](file://backend/apps/api/src/modules/plans/infrastructure/schemas/challenge.schema.ts#L23-L70)
- [subscription.schema.ts:5-27](file://backend/apps/api/src/modules/plans/infrastructure/schemas/subscription.schema.ts#L5-L27)
- [payment.schema.ts:5-56](file://backend/apps/api/src/modules/plans/infrastructure/schemas/payment.schema.ts#L5-L56)
- [reward.schema.ts:20-50](file://backend/apps/api/src/modules/challenge/infrastructure/schemas/reward.schema.ts#L20-L50)
- [kyc-application.schema.ts:38-61](file://backend/apps/api/src/modules/kyc/infrastructure/kyc-application.schema.ts#L38-L61)