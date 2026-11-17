# Taking the harness down

Part of antheo-stress. Open it when building the harness, so it can come out in one step, and again when the work
is done. A stress page that stays behind is a route nobody owns, fixtures that look like real data, and a flag
someone will find in a year.

## 1. Build it to be removed

- **One folder.** The harness page, the fixtures, the mocks and any helper live in one folder with a name that can
  be searched for: `stress-harness/`, or the route folder the framework needs.
- **One marker.** Any line that must live outside that folder (a route registered in a list, a mock worker started
  in development, an environment flag, a link in a dev menu) carries the comment `STRESS-HARNESS` on the same line.
- **A list as you go.** Keep the list of everything added: files, marked lines, a dependency, a script in the
  package file, the screenshot folder. It goes in the result.
- **Never in the component.** No test id, prop or branch added to the component for the harness
  (`references/data-boundary.md`).
- **Not reachable in production** while it exists: a development-only route or a guard that returns 404 in a
  production build.

## 2. Take it down in one step

When the last re-run is recorded, in one change:

1. Delete the folder.
2. Delete every line marked `STRESS-HARNESS`.
3. Remove what the list names outside the source: the dependency and its lockfile entry, the script, the flag in
   the environment file, the mock worker file in the public folder.
4. Move the screenshots to where the record points, or delete them. They are not committed unless the project
   keeps such evidence.

## 3. Prove nothing is left

```bash
git grep -n -i -e "stress-harness" -e "<the fixture file's name>"   # prints nothing, exit 1 (the marker and the folder)
git ls-files --others --exclude-standard                           # no harness, fixture or screenshot file
git status --porcelain                                             # only the fixes that belong to the work
```

| Search for | Because |
|---|---|
| The route | the folder is gone and the path is in no route list, sitemap or menu; the built app answers 404 at it |
| Imports | nothing imports the fixtures or the mocks; a production build passes with them gone |
| Flags | the environment variable, the `?state=` or `?variant=` reader, the dev-menu entry |
| Fixture files | JSON, images and fonts added for the run, in the source and in the public folder |
| Dependencies | a mock or faker library added for the run, in the package file and the lockfile |

Done when all three commands show nothing of the harness and the project still builds.

## 4. Unless the project keeps stories or examples

If the project already has a place for component states (`*.stories.*` files, an `examples/` or `playground/`
folder, a docs site), the states are worth keeping there:

- Move each state into that folder in the project's own format, one entry per state, the fixtures beside them the
  way the other entries keep theirs.
- Run the project's own command for that folder and see the new entries load. That is the proof.
- Still remove the throwaway route, the marked lines and the flags, and run the searches in section 3.

Never add a stories tool to a project that has none: that is a decision for the person, not a side effect of a
stress run.

## 5. Say which, in the result

One line, last in the record:

```
harness: removed in one change · searches clean · build passes
harness: kept as stories at src/components/member-row/member-row.stories.tsx (8 states) · route and flag removed
harness: left in place at app/stress-harness (3 breaks open with antheo-layout) · remove by deleting the folder
```

The third is allowed only while breaks are open and the harness is needed to re-run them. It names the path and
the one step that removes it.
