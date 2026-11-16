# Any stack

The skills judge what people see, read and use, so they don't depend on the framework. Three things change per
stack: where the style block goes, how the checks reach the page, and which linter backs up antheo-access while you
type. Everything else (the usage rules, the pattern cards, the recipes, the words) is the same in all of them.

## Where the style block goes

Load `quiet.css` once, globally, **before** any other CSS, so its classes (`.card`, `.btn`, `.field`) work in every
template and its variables reach every component, scoped styles included (custom properties pass through Vue
`scoped`, Svelte's scoping, Angular's emulated encapsulation and shadow DOM).

| Stack | Put it | Load it |
|---|---|---|
| Plain HTML | first `<style>` in `<head>`, or `quiet.css` beside the page | `<link rel="stylesheet" href="quiet.css">` first |
| Astro | `src/styles/quiet.css` | `import '../styles/quiet.css'` in the base layout's frontmatter |
| React (Vite) / Next.js | `src/quiet.css` / `app/quiet.css` | `import './quiet.css'` first in `main.tsx` / the root `layout.tsx` |
| Vue / Nuxt | `src/assets/quiet.css` | `import './assets/quiet.css'` first in `main.ts` / `css: ['~/assets/quiet.css']` in `nuxt.config` |
| Svelte / SvelteKit | `src/quiet.css` | `import '../quiet.css'` in the root `+layout.svelte` |
| Angular | `src/quiet.css` | first entry of `"styles"` in `angular.json` (or `@import` at the top of `src/styles.css`) |
| Django | `static/css/quiet.css` | `<link rel="stylesheet" href="{% static 'css/quiet.css' %}">` first in `base.html` |
| Flask / FastAPI (Jinja) | `static/quiet.css` | `<link rel="stylesheet" href="{{ url_for('static', path='quiet.css') }}">` (Flask: `filename=`) |
| Rails | `app/assets/stylesheets/quiet.css` | `stylesheet_link_tag "quiet"` first in the application layout |
| Laravel | `resources/css/quiet.css` | first in `@vite([...])` in the main layout |
| Phoenix | `assets/css/quiet.css` | `@import "./quiet.css";` at the top of `app.css` |
| Streamlit / Gradio | a string in the app | `st.markdown('<style>…</style>', unsafe_allow_html=True)` / `gr.Blocks(css=…)` |
| SwiftUI / Compose / Flutter | not CSS | take the values from `tokens.mjs`'s W3C JSON into the platform's colour and type styles |

Streamlit and Gradio draw their own widgets, so only the colours, type and spacing carry; the control sizes and
states are the library's. Say so instead of claiming the build follows the block. On native platforms the usage
rules still hold (sizes, weights, one primary, wells, no outlines); antheo-mobile covers the platform conventions.

## Classes, utilities and component styles

- **Templates and JSX** use the block's classes: `class="card"`, `className="btn btn-primary"`.
- **Scoped styles, CSS modules, Sass** read the variables: `color: var(--text-2)`. Never copy a value out of the
  block into a component.
- **Tailwind v4:** keep `quiet.css` global and map its names into the theme, so utilities read the block and follow
  its dark mode:

  ```css
  @import "tailwindcss";
  @import "./quiet.css";
  @theme inline {
    --color-bg: var(--bg); --color-surface: var(--surface); --color-well: var(--well);
    --color-text: var(--text); --color-text-2: var(--text-2); --color-text-3: var(--text-3);
    --color-accent: var(--accent); --color-danger: var(--danger); --color-line: var(--line);
    --radius-tag: var(--r-tag); --radius-control: var(--r-control); --radius-card: var(--r-card);
    --shadow-card: var(--sh-card); --shadow-lift: var(--sh-lift);
  }
  ```

  Then `bg-surface text-text-2 rounded-card shadow-card`. Tailwind v3: the same names under `theme.extend` as
  `'var(--surface)'` strings. Never Tailwind's own palette (`bg-indigo-500`, `text-gray-500`) or its free sizes
  (`text-[15px]`, `rounded-2xl`): they are the invented-as-it-goes styles the block replaces. For a brand's own
  Tailwind theme, antheo-tokens writes `tokens.tailwind.css`.
- **CSS-in-JS and theme objects** (styled-components, Emotion, MUI, Chakra, Vuetify, Angular Material): the theme's
  values are `'var(--surface)'` strings, not hex, so one block still drives light and dark.
- **A component library already in the app** (shadcn/ui, MUI, Vuetify, PrimeVue, Angular Material, Skeleton): map its
  tokens onto the block's names once (for shadcn, `--background: var(--bg); --card: var(--surface); --muted-foreground:
  var(--text-2); --radius: var(--r-card)` and so on) rather than restyling each component. That mapping is antheo-system's job.

## The checks reach the rendered page

The page tools take a URL, so they work on any stack that serves HTML. Start the dev server and point them at it:

```sh
npm run dev | ng serve | python manage.py runserver | flask run | rails s | php artisan serve | mix phx.server
node <antheo-review>/scripts/check-page.mjs http://localhost:4200/settings
node <antheo-review>/scripts/gate.mjs arm http://localhost:8000/settings/ --copy templates/settings
```

The source tools read files in any of these stacks:

- `copy-lint.mjs`: HTML, JSX/TSX, Vue, Svelte, Astro, Angular templates, Jinja/Django, ERB, Blade, Twig, Liquid,
  Handlebars, Nunjucks, EJS, HEEx, and JSON locale files. Template tags read as values (`{{ count }} tasks`).
- `check-block-names.mjs src`: every custom property read in the project's styles, components and templates is defined
  somewhere in the project.
- `audit-values.mjs` (antheo-system): the hardcoded values across a codebase.

Python-only interfaces (Streamlit, Gradio, Dash, NiceGUI) are checked on their running URL like any page.

## Linters that back up antheo-access

They catch the static half while you type; `a11y-probe.mjs` and the page check catch what only shows when it runs
(focus order, names computed at runtime, contrast over images).

| Stack | Linter |
|---|---|
| React / Next.js | `eslint-plugin-jsx-a11y` |
| Vue / Nuxt | `eslint-plugin-vuejs-accessibility` |
| Svelte | the compiler's own `a11y_*` warnings; keep them on and treat them as errors in CI |
| Angular | `@angular-eslint`'s template accessibility rules |
| Astro | `eslint-plugin-astro`'s `jsx-a11y` rules |
| Server templates, Python UIs | none reliable: run `a11y-probe.mjs` on the rendered page |

## What the skills don't cover, and what to pair them with

The skills own what people see and use: values, layout, words, motion, states and access. They don't teach a
framework or how to structure code. Pair them with:

- **A performance guide for your framework** (waterfalls, bundle size, re-renders).
- **A testing and debugging practice** for test-first work and for tracking a bug to its cause.
- **The framework's own guides** for Vue, Svelte, Angular, Django, Rails and Laravel conventions.

When two skills touch the same thing, the framework skill owns code structure, data flow and performance, and the
Antheo skill owns the values, the layout, the words, the motion and how it behaves for people.
