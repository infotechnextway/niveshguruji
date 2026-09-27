# Dependencies

From your Next.js app root:

```bash
npm install framer-motion lucide-react
```

That's it — this version uses an **animated SVG equity curve** instead of WebGL,
so there's no `three` / react-three-fiber dependency and nothing heavy to load.

| Package        | Version  |
| -------------- | -------- |
| next           | 14 or 15 |
| react/react-dom| 18 or 19 |
| framer-motion  | ^11      |
| lucide-react   | ^0.400   |

No Tailwind required. All styling is plain CSS scoped under `.ng-root`.
