export type RubricLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  description: string;
};

export type RubricCriterion = {
  label: string;
  levels: [RubricLevel, RubricLevel, RubricLevel, RubricLevel, RubricLevel];
};

export type Rubric = {
  slug: string;
  title: string;
  criteria: RubricCriterion[];
};

export const rubrics: Rubric[] = [
  {
    slug: "bugs-correctness",
    title: "Bugs & Correctness",
    criteria: [
      {
        label: "Error handling",
        levels: [
          { level: 1, description: "No try/catch, unhandled promise rejections crash the app" },
          { level: 2, description: "Some try/catch but errors silently swallowed or logged inconsistently" },
          { level: 3, description: "Errors caught at major boundaries, user sees generic fallback" },
          { level: 4, description: "Error boundaries per feature, structured logging, user-friendly messages" },
          { level: 5, description: "Typed error hierarchy, automatic retry/recovery, error tracking in CI" },
        ],
      },
      {
        label: "State management",
        levels: [
          { level: 1, description: "Race conditions in fetches, stale closures, prop-drilling 5+ levels" },
          { level: 2, description: "Some shared state but updates conflict, no derived state patterns" },
          { level: 3, description: "Single store or context per domain, basic optimistic updates" },
          { level: 4, description: "Derived state computed, no stale reads, concurrent-safe updates" },
          { level: 5, description: "State machines for complex flows, snapshot testing of transitions" },
        ],
      },
      {
        label: "Edge cases",
        levels: [
          { level: 1, description: "Null/undefined crashes, empty arrays render broken UI, no loading states" },
          { level: 2, description: "Some null checks but inconsistent, happy path only in tests" },
          { level: 3, description: "Empty states handled, boundary values tested, basic guards" },
          { level: 4, description: "Exhaustive switch/case, property-based tests for edge inputs" },
          { level: 5, description: "Fuzzing or generative tests, zero known uncovered branches" },
        ],
      },
      {
        label: "Type safety",
        levels: [
          { level: 1, description: "Widespread `any`, no strict mode, runtime type mismatches" },
          { level: 2, description: "Some types but frequent `as` casts and non-null assertions" },
          { level: 3, description: "Strict mode on, most interfaces typed, few escape hatches" },
          { level: 4, description: "Discriminated unions, exhaustive narrowing, no unsafe casts" },
          { level: 5, description: "End-to-end type safety (API to UI), generics for reusable code" },
        ],
      },
    ],
  },
  {
    slug: "performance",
    title: "Performance",
    criteria: [
      {
        label: "Bundle size",
        levels: [
          { level: 1, description: "Single monolithic bundle > 500 KB, no code splitting" },
          { level: 2, description: "Route-level splitting attempted but vendor chunk still huge" },
          { level: 3, description: "Dynamic imports for heavy deps, reasonable chunk sizes" },
          { level: 4, description: "Tree-shaken, per-route budgets enforced, no barrel-file bloat" },
          { level: 5, description: "Sub-100 KB initial JS, automated bundle analysis in CI" },
        ],
      },
      {
        label: "Rendering efficiency",
        levels: [
          { level: 1, description: "Full page re-render on every state change, no memoization" },
          { level: 2, description: "Some React.memo but deps arrays wrong, lists missing keys" },
          { level: 3, description: "Proper keys, useMemo/useCallback where measured, no layout thrash" },
          { level: 4, description: "Virtualized long lists, profiler-verified render counts" },
          { level: 5, description: "Server components for static content, zero wasted re-renders" },
        ],
      },
      {
        label: "Data fetching",
        levels: [
          { level: 1, description: "Waterfall requests on mount, no caching, duplicate fetches" },
          { level: 2, description: "Some parallel fetches but no cache invalidation strategy" },
          { level: 3, description: "SWR/React Query with stale-while-revalidate, loading skeletons" },
          { level: 4, description: "Prefetching on hover/route, optimistic mutations, cache coordination" },
          { level: 5, description: "Edge caching, streaming responses, zero-waterfall architecture" },
        ],
      },
      {
        label: "Core Web Vitals",
        levels: [
          { level: 1, description: "LCP > 6s, CLS > 0.25, no performance monitoring" },
          { level: 2, description: "LCP 4-6s, some layout shifts, images without dimensions" },
          { level: 3, description: "LCP 2.5-4s, CLS < 0.1, basic image optimization" },
          { level: 4, description: "LCP < 2.5s, all Core Web Vitals green, font display swap" },
          { level: 5, description: "Sub-second LCP, INP < 200ms, RUM dashboards, perf budgets in CI" },
        ],
      },
    ],
  },
  {
    slug: "security",
    title: "Security",
    criteria: [
      {
        label: "Input sanitization",
        levels: [
          { level: 1, description: "Raw user input in innerHTML, no output encoding, SQL concatenation" },
          { level: 2, description: "Some escaping but inconsistent, dangerouslySetInnerHTML in use" },
          { level: 3, description: "Framework auto-escaping relied on, parameterized queries" },
          { level: 4, description: "CSP headers, DOMPurify for rich content, input validation schemas" },
          { level: 5, description: "Strict CSP, automated XSS scanning in CI, no raw HTML paths" },
        ],
      },
      {
        label: "Auth & sessions",
        levels: [
          { level: 1, description: "Tokens in localStorage, no CSRF protection, shared credentials" },
          { level: 2, description: "HttpOnly cookies but no refresh rotation, weak session expiry" },
          { level: 3, description: "Token refresh, CSRF tokens, role-based access on API routes" },
          { level: 4, description: "Short-lived JWTs, server-side session validation, MFA available" },
          { level: 5, description: "Zero-trust middleware, device binding, session anomaly detection" },
        ],
      },
      {
        label: "Dependency security",
        levels: [
          { level: 1, description: "No lock file, outdated deps with known CVEs, no audit process" },
          { level: 2, description: "Lock file exists but `npm audit` warnings ignored" },
          { level: 3, description: "Regular audits, critical CVEs patched within a week" },
          { level: 4, description: "Automated Dependabot/Renovate, audit gate in CI pipeline" },
          { level: 5, description: "SBOM tracked, zero known vulnerabilities, license compliance" },
        ],
      },
      {
        label: "Secrets management",
        levels: [
          { level: 1, description: "API keys hardcoded in source, .env committed to git" },
          { level: 2, description: ".env in .gitignore but secrets shared via chat, no rotation" },
          { level: 3, description: "Env vars via hosting platform, server-only access enforced" },
          { level: 4, description: "Vault/KMS for secrets, automatic rotation, least-privilege scoping" },
          { level: 5, description: "Secret scanning in CI, no long-lived credentials, audit trail" },
        ],
      },
    ],
  },
  {
    slug: "ux-accessibility",
    title: "UX & Accessibility",
    criteria: [
      {
        label: "Keyboard navigation",
        levels: [
          { level: 1, description: "No focus styles, tab order broken, custom widgets not operable" },
          { level: 2, description: "Some focus rings but skip links missing, modals trap focus" },
          { level: 3, description: "Logical tab order, skip-to-content link, focus trapped in modals" },
          { level: 4, description: "Arrow-key navigation in menus, roving tabindex, focus restoration" },
          { level: 5, description: "Full keyboard parity with mouse, screen-reader tested, CI a11y checks" },
        ],
      },
      {
        label: "Semantic HTML",
        levels: [
          { level: 1, description: "Div soup, no landmarks, headings out of order, no ARIA" },
          { level: 2, description: "Some semantic tags but inconsistent, missing alt text on images" },
          { level: 3, description: "Landmarks, heading hierarchy, alt text, form labels present" },
          { level: 4, description: "ARIA roles on custom widgets, live regions for dynamic content" },
          { level: 5, description: "WAI-ARIA authoring practices followed, automated a11y tests in CI" },
        ],
      },
      {
        label: "Visual accessibility",
        levels: [
          { level: 1, description: "Low contrast text, color-only indicators, no reduced-motion support" },
          { level: 2, description: "Some contrast fixes but fails WCAG AA in spots, small touch targets" },
          { level: 3, description: "WCAG AA contrast, 44px touch targets, prefers-reduced-motion respected" },
          { level: 4, description: "WCAG AAA contrast on key content, scalable to 200% zoom, dark mode" },
          { level: 5, description: "Tested with screen magnifiers, high-contrast mode, no info lost at 400% zoom" },
        ],
      },
      {
        label: "Loading & error states",
        levels: [
          { level: 1, description: "Blank screens while loading, infinite spinners, errors vanish silently" },
          { level: 2, description: "Generic spinner, error alert with 'Something went wrong'" },
          { level: 3, description: "Skeleton screens, contextual error messages, retry buttons" },
          { level: 4, description: "Progressive loading, optimistic UI, errors scoped to the failing section" },
          { level: 5, description: "Streaming SSR, graceful degradation, offline-ready with service worker" },
        ],
      },
    ],
  },
  {
    slug: "design-system",
    title: "Design System",
    criteria: [
      {
        label: "Atomic Design",
        levels: [
          { level: 1, description: "No component hierarchy, features built as monoliths" },
          { level: 2, description: "Some reusable components but no clear atom/molecule/organism layers" },
          { level: 3, description: "Atoms and molecules identified, organisms compose them consistently" },
          { level: 4, description: "Strict layer boundaries, templates for page layouts, documented composition rules" },
          { level: 5, description: "Full atomic hierarchy with Storybook stories at each layer, enforced via linting" },
        ],
      },
      {
        label: "Design Tokens",
        levels: [
          { level: 1, description: "Raw hex values and magic numbers scattered across files" },
          { level: 2, description: "Some CSS variables but naming is inconsistent, gaps in coverage" },
          { level: 3, description: "Centralized token file for colors, spacing, typography, radius" },
          { level: 4, description: "Semantic token aliases (e.g., color-primary, space-4), light/dark themes" },
          { level: 5, description: "Tokens synced from design tool, typed token references, no raw values anywhere" },
        ],
      },
      {
        label: "Component reuse",
        levels: [
          { level: 1, description: "Copy-pasted components, 3+ versions of the same button" },
          { level: 2, description: "Some shared components but one-off variants everywhere" },
          { level: 3, description: "Shared component library, variants via props, consistent APIs" },
          { level: 4, description: "Composition over configuration, slot patterns, documented prop contracts" },
          { level: 5, description: "Component usage audited, unused variants pruned, adoption metrics tracked" },
        ],
      },
      {
        label: "Spacing & layout",
        levels: [
          { level: 1, description: "Arbitrary margins/padding, no grid system, layouts break at common widths" },
          { level: 2, description: "Inconsistent spacing scale, some responsive breakpoints but gaps" },
          { level: 3, description: "Spacing scale from tokens, mobile-first breakpoints, consistent gutters" },
          { level: 4, description: "Layout primitives (Stack, Grid), container queries for components" },
          { level: 5, description: "Spacing lint rules, visual regression tests for layout, fluid typography" },
        ],
      },
      {
        label: "Typography",
        levels: [
          { level: 1, description: "Random font sizes, no scale, weights chosen per-element" },
          { level: 2, description: "Some heading styles but body text inconsistent across pages" },
          { level: 3, description: "Type scale defined (xs-5xl), heading/body weights standardized" },
          { level: 4, description: "Responsive type scaling, line-height/letter-spacing tokens, font loading optimized" },
          { level: 5, description: "Type components enforce scale, no raw font-size in codebase, variable fonts" },
        ],
      },
    ],
  },
  {
    slug: "dry-solid-ssot-kiss",
    title: "DRY, SOLID, SSOT, KISS",
    criteria: [
      {
        label: "Code duplication",
        levels: [
          { level: 1, description: "Same logic copy-pasted in 5+ places, no shared utilities" },
          { level: 2, description: "Some helpers exist but duplication still common in feature code" },
          { level: 3, description: "Shared hooks/utils for repeated patterns, most duplication removed" },
          { level: 4, description: "Extracted custom hooks, utility library, lint rule flags obvious duplication" },
          { level: 5, description: "Near-zero duplication, automated detection in CI, refactoring discipline" },
        ],
      },
      {
        label: "Single responsibility",
        levels: [
          { level: 1, description: "God components doing fetch + render + validation + routing" },
          { level: 2, description: "Some separation but business logic mixed into UI components" },
          { level: 3, description: "Logic in hooks, UI in components, API layer separate" },
          { level: 4, description: "Clear module boundaries, each file has one reason to change" },
          { level: 5, description: "Dependency injection, interface-driven boundaries, independently testable modules" },
        ],
      },
      {
        label: "Source of truth",
        levels: [
          { level: 1, description: "Same constant defined in 3 files, config scattered, types out of sync" },
          { level: 2, description: "Some centralization but derived values manually duplicated" },
          { level: 3, description: "Config in one place, types generated or co-located with schemas" },
          { level: 4, description: "Schema-driven types (Zod/OpenAPI), single config consumed everywhere" },
          { level: 5, description: "End-to-end SSOT: DB schema -> API types -> UI types, zero manual sync" },
        ],
      },
      {
        label: "Simplicity",
        levels: [
          { level: 1, description: "Premature abstractions, 6-layer indirection for a simple CRUD" },
          { level: 2, description: "Over-engineered in spots, some dead code, unclear naming" },
          { level: 3, description: "Code readable at a glance, abstractions justified by actual reuse" },
          { level: 4, description: "Minimal indirection, no dead code, naming conveys intent clearly" },
          { level: 5, description: "New dev productive in hours, every abstraction earns its keep, docs optional" },
        ],
      },
    ],
  },
];

export function getRubricBySlug(slug: string): Rubric | undefined {
  return rubrics.find((r) => r.slug === slug);
}
