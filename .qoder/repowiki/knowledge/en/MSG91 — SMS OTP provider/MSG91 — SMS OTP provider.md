---
kind: external_dependency
name: MSG91 — SMS OTP provider
slug: msg91
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

When `SMS_PROVIDER=msg91`, the platform sends OTPs via MSG91 using `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. The default is `console` (no-op) for development. These values are injected into both `api` and `engine` containers via the compose environment block.