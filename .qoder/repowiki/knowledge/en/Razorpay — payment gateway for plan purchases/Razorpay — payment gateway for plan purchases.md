---
kind: external_dependency
name: Razorpay — payment gateway for plan purchases
slug: razorpay
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Razorpay is the production payment provider selected via `PAYMENT_PROVIDER=razorpay`. The backend creates orders in paise, verifies checkout signatures (HMAC-SHA256 against `RAZORPAY_KEY_SECRET`) and webhook signatures (raw-body HMAC against `RAZORPAY_WEBHOOK_SECRET`), and issues refunds. The dashboard webhook must point to `https://YOUR_DOMAIN/api/v1/webhooks/payment` for `payment.captured` / `order.paid` events. When unset, `manual` provider is used for dev/e2e.