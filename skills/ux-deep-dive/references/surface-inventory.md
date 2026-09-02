# Surface inventory

The inventory is built from the code before the first tap, and it is the coverage contract for the run. Walking without it produces "the screens I happened to find", which is not an audit.

## Where routes live

| Stack | Where to look |
|---|---|
| Expo Router | the `app/` tree: every file is a route; `(group)` directories, `[param]` dynamic segments, and `_layout` files define tabs and stacks; `+not-found` is a screen too |
| React Navigation | navigator definitions: grep for `createNativeStackNavigator`, `createBottomTabNavigator`, and `.Screen name=` |
| Next.js | `app/**/page.*` and `pages/**`; `layout`, `loading`, `error`, and `not-found` files are states of their routes |
| React Router | `createBrowserRouter` route objects or `<Route path=` elements; `errorElement` and loaders imply states |
| Remix, SvelteKit, Nuxt, SolidStart | file-based `routes/` or `src/routes/`; `+error`, `+layout`, and their equivalents are states |
| Angular | `Routes` arrays; lazy `loadChildren` modules hide whole sections |
| Vue Router | the `routes` array; nested `children` |
| Flutter | `MaterialApp.routes`, `onGenerateRoute`, `GoRouter` route lists |
| SwiftUI | no file-based routing: grep for `NavigationLink`, `.navigationDestination`, `.sheet`, `.fullScreenCover`, `.alert`, and `TabView`; each destination view is a screen |
| UIKit | storyboards and segues, plus every `present(` and `pushViewController(` |
| Android XML | `nav_graph.xml` destinations and actions |
| Jetpack Compose | `NavHost` and each `composable("route")`; bottom bar items |

Add to whatever the router says:

- Modals, sheets, action sheets, alerts, and confirmation dialogs.
- Error boundaries and their fallback screens.
- Flag-gated branches (every flag from the environment ladder).
- Gates: onboarding, profile completion, permission primers, forced updates, reactivation.
- Auth states: logged out, expired session, a protected route reached directly.
- Deep-link-only screens with no in-app entry point.
- Empty states for every list, and the state after the first item exists.

## Sections

Group the routes into lettered sections in the order a first-time user meets them:

1. Authentication and onboarding.
2. The primary tabs, in tab order, each as its own section when it has depth.
3. Hub or menu screens and everything reachable from them.
4. Settings, account, consent.
5. Flag-gated features.
6. A final section for error and edge states: crashes, false alarms, empty detail screens, dead ends.

Each section gets a letter, a title, and a one-sentence blurb for its divider page. A section with one screen is folded into a neighbor.

## States per screen

| State | Capture when |
|---|---|
| Default | always |
| Scrolled | new content below the fold; one capture per new screenful |
| Empty | any list, feed, or search result |
| Loading | only if it lasts long enough to matter, or shows skeletons worth judging |
| Error | any screen with a network dependency; force it by stopping the fixture once |
| Keyboard up | any screen with a text input |
| Primary action disabled and enabled | any form or gate |
| Filled | any form, with plausible values, before submit |
| After submit | any form, both success and validation failure |
| Dark mode, large text | the six to eight most important screens, at the end |

## The inventory table

Keep it in `build/inventory.md` and update it as the walk proceeds:

| route | section | states planned | captures | status |
|---|---|---|---|---|
| `(auth)/login` | A | default, keyboard, filled, disabled, enabled | 01, 02, 03 | captured |
| `(stacks)/camera` | J | default | | could not reach: camera unavailable on the simulator |

Status is one of two values: `captured`, or `could not reach` with the reason. The two totals ("N of M routes captured") go in the README. A route skipped for time is `could not reach: out of time`; it is not deleted from the table.

## Time budget

A screen with its states takes about a minute to capture and note once the rig is calibrated. Fifty routes is most of an hour of walking. Plan the section order before starting, so that if time runs out it runs out on the least important section rather than a random one.
