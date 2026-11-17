# Where the test data goes in

Part of antheo-stress. Open it when the component does not take all its data as props: it loads, fetches or is
rendered on a server. Awkward content enters at the component's **data boundary**, the place real data enters. It
never enters by editing the component.

## The rule, and its proof

Never stress a component by changing its insides: a long string typed over the real one, a fetch commented out, an
`if (true)`, a default prop changed, a `debug` prop only the harness uses. Then the thing tested is not the thing
that ships, and the edit can ship by accident.

Proof: `git status --porcelain` shows only new files in the harness folder. The component's own files are not in
the list, unless a break was fixed, and that fix is a separate change.

## Three boundaries, nearest first

| The component gets its data from | The fixture goes in | How |
|---|---|---|
| Its props | the harness | pass the fixture object through the normal props. Nothing else is needed |
| A loader, a hook, a store or a context (`useInvoices()`, a route loader, a provider) | that function's result | the harness page has its own loader that returns fixtures, or wraps the component in the real provider seeded with them. Replace the data, never the component's call |
| A request it makes itself | the response | answer the request with the fixture: a route handler in a browser test (fulfil with JSON, delay it, abort it), a mock worker in development, or a fake fetch the component already accepts. This is also how loading, error and slow are produced |

Go one boundary further out only when the nearer one cannot produce the case. Props cannot produce a failed
request; a mocked response can.

Fixtures live in one plain-data module beside the harness (`fixtures.ts`), imported by the harness only. Proof:
search for its file name across the source; the only import is the harness. Shape each fixture exactly as the real
data arrives, the awkward parts included: a date as the ISO string the API sends, not a `Date`; an amount in the
unit the API uses (cents or units); a missing value as `null`, `""` or an absent key, whichever the API really does.
Each of those is its own case.

## Server-rendered frameworks: which side of the line

A component rendered on the server reads its data on the server. A fixture that lives in the browser never reaches
it: a request made by the server does not pass through the browser, so a browser-side mock (a route handler in the
test, a mock worker) does not see it.

| The data is read | The fixture lives | Notes |
|---|---|---|
| On the server, in the component or its loader | on the server | the harness route is a server page that passes fixtures as props, or its loader returns them, chosen by `?state=` read on the server |
| On the server, then passed to a client component as props | on the server, in the harness page | the fixture crosses the line serialised, so keep it plain data: strings, numbers, booleans, arrays, plain objects. No functions, no class instances |
| In the browser, after load (an effect, a query library) | in the browser | mock the response at the network, or seed the query cache in a provider around the component |
| By a form post or a server action | nowhere in the component: the awkward input goes through the real form | point the action at a development backend or a fake handler on the server. Never real data |

Things only the server side can show:

- **Slow.** Delay the fixture on the server (a loader that waits) to see the real fallback, skeleton or stream. A
  delay added in the browser shows nothing: the HTML has already arrived.
- **Error.** Throw from the server-side fixture to see the real error boundary and status code.
- **Hydration.** A fixture that differs between the server render and the browser (the current time, a random id,
  a number formatted by locale) gives a mismatch warning in the console. Use fixed values. If a fixed, real-shaped
  value still warns (a date shown in the viewer's time zone), that is a break: record it.

## Done

- [ ] Every fixture enters through props, a loader or a mocked response; none by editing the component
- [ ] `git status --porcelain` lists no change to the component's files from the stress run
- [ ] The fixture module is plain data, shaped as the API sends it, and imported by the harness only
- [ ] For a server-rendered component the fixture is on the server side, and slow and error were made there
