# Home Assistant device-specific default dashboard (fixed)

A fix for the [Restore device-specific default dashboard](https://community.home-assistant.io/t/restore-device-specific-default-dashboard/965146)
community workaround, which no longer works as originally posted against
current Home Assistant frontend releases (tested against 2026.8.1).

Home Assistant removed the old per-browser default dashboard behavior when it
introduced system-wide/user-level default dashboards. This adds back a
per-device default via a custom sidebar panel: pick a dashboard on a given
device/browser, and it's remembered for that device (via `localStorage`)
independently of any other device.

## Install via HACS (recommended)

1. HACS → the `⋮` menu (top right) → **Custom repositories** → paste
   `https://github.com/YaddyVirus/ha-device-default-dashboard`, category
   **Dashboard** → **Add**.
2. Find **Device Default Dashboard** in HACS and install it. This downloads
   `device-default-dashboard.js` to
   `<config>/www/community/ha-device-default-dashboard/device-default-dashboard.js`,
   served at `/hacsfiles/ha-device-default-dashboard/device-default-dashboard.js`.
3. Add this to `configuration.yaml` (under a `panel_custom:` key — create it
   if you don't already have one):
   ```yaml
   panel_custom:
     - name: device-default-dashboard
       sidebar_title: Set Device Dashboard
       sidebar_icon: mdi:devices
       module_url: /hacsfiles/ha-device-default-dashboard/device-default-dashboard.js?v=1
   ```
4. Restart Home Assistant.
5. Open the new **Set Device Dashboard** entry in the sidebar, on each device
   you want a distinct default for, and pick a dashboard. Optionally hide the
   sidebar entry afterwards via your profile's "Sidebar" reordering.

Future updates: bump the same `?v=` query string in your own config any time
you update the HACS-managed file to a new version, for the same caching
reason described in the gotchas below — HACS updating the file on disk
doesn't by itself bust each device's cached copy of the old URL.

## Manual install (without HACS)

1. Copy `device-default-dashboard.js` to `<config>/www/dashboard/device-default-dashboard.js`.
2. Add the contents of `configuration-snippet.yaml` to your `configuration.yaml`
   (under a `panel_custom:` key — create it if you don't already have one).
3. Restart Home Assistant.
4. Open the new **Set Device Dashboard** entry in the sidebar, on each device
   you want a distinct default for, and pick a dashboard. Optionally hide the
   sidebar entry afterwards via your profile's "Sidebar" reordering.

## What was wrong with the original script, and what changed

The version posted in the forum thread breaks on current Home Assistant for
four independent reasons. All four are fixed in this repo's version of the
script:

1. **A stale system-wide default silently overrides everything.**
   Home Assistant resolves the default dashboard in this order:
   `hass.userData.default_panel` → `hass.systemData.default_panel` →
   `localStorage["defaultPanel"]` (the per-device value this script sets) →
   built-in Home panel. If a system-wide default was ever set (Settings →
   Dashboards → a dashboard → "Set as Default"), it wins over any per-device
   choice, no matter what this script does. The script does attempt to clear
   both `userData` and `systemData` when you make a selection — but if you
   already had one set from before you ever installed this script, and never
   actually completed a selection through the panel, it stays put. If you hit
   this, clear it once via **Settings → Dashboards → (the dashboard marked
   default) → toggle "Set as Default" off**.

2. **The `LitElement` bootstrap trick used a lazily-loaded element.**
   The original script got `LitElement` via
   `Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))` — a
   common way to avoid bundling your own copy of Lit. `ha-panel-lovelace`
   is only registered once you've actually opened a Lovelace dashboard in
   that browser session, though. Navigating straight to the custom panel
   (e.g. from a fresh login or a bookmark) means that element doesn't exist
   yet, so `Object.getPrototypeOf(undefined)` throws
   (`TypeError: can't convert undefined to object`) before anything renders
   — a blank page with no console output beyond the error.
   **Fix:** grab `LitElement` off `home-assistant-main` instead, which is
   part of the app shell and is always defined by the time any panel,
   including this one, renders.

3. **`ha-select` no longer works with manually-built `<ha-list-item>` children.**
   Home Assistant rewrote `ha-select` to wrap a new `<ha-dropdown>`
   ("webawesome") component that only reacts to its own auto-generated
   `<ha-dropdown-item>` elements via a `wa-select` event. The original
   script manually built `<ha-list-item>` elements and relied on the old
   `selected` event firing directly off list-item clicks. The dropdown
   still visually renders (the items show up), but clicking one does
   nothing — no event fires, so nothing gets saved.
   **Fix:** pass dashboards to `ha-select` via its own `.options` property
   (letting it generate its own correctly-wired items) and read the
   selection back via `ev.detail.value`, matching how Home Assistant's own
   dashboard picker (Settings → your profile) does it internally.

4. **Aggressive caching on `/local/` static files.** Home Assistant serves
   `/local/` assets with `Cache-Control: public, max-age=2678400` (31 days).
   Combined with how browsers cache dynamically `import()`-ed ES modules,
   a plain hard-refresh often isn't enough to pick up changes to the script
   — every device that's already loaded it once may keep running a stale
   copy for up to a month.
   **Fix:** append a version query string to `module_url`
   (`device-default-dashboard.js?v=1`) and bump it any time you edit the
   file. A new query string is a new URL as far as the browser's cache is
   concerned, so this reliably busts it everywhere.

## Limitations (inherited from the original approach)

- Only dashboards you've created yourself are selectable (not the built-in
  Overview).
- This is a client-side `localStorage` hack, not an officially supported
  feature — a future Home Assistant frontend release could change
  `ha-select`, rename `home-assistant-main`, or drop the legacy
  `localStorage["defaultPanel"]` fallback entirely, breaking this again
  without warning.
- Setting a per-device dashboard here permanently clears any system-wide or
  per-user default dashboard setting for your account (that's what makes
  per-device selection possible at all) — devices that never visit this
  panel will fall back to the plain Home panel instead of whatever your old
  system default was.
