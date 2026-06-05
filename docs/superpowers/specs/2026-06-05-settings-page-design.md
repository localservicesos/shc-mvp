# Settings Page Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Allow the business owner to view and edit their business contact/identity fields directly in the app, replacing manual database edits.

## Fields

| Field         | Input type | Required | Notes                          |
|---------------|------------|----------|-------------------------------|
| Business Name | text       | yes      |                               |
| ABN           | text       | no       | hint: "e.g. 12 345 678 901"   |
| Email         | email      | no       |                               |
| Phone         | text       | no       |                               |
| Address       | textarea   | no       |                               |

## Out of scope

- Timezone, currency — not editable via this page
- Logo upload — future work
- Staff permissions / multi-user settings — future work

## Architecture

### Route
`/app/settings` — sits within the existing app layout (sidebar + auth guard).

### Page — `app/app/settings/page.tsx`
Server Component. Calls `getCurrentBusiness()` to load current values, passes them as `initial` props to `SettingsForm`.

### Form — `components/forms/settings-form.tsx`
Client Component. Follows the same pattern as `customer-form.tsx`:
- Controlled inputs with `useState`
- `useTransition` for async submission
- Inline error message on failure
- Inline success message on save (no redirect needed)

### Server Action — `app/app/settings/actions.ts`
- Calls `getCurrentBusiness()` to get `business_id`
- Runs a Supabase `update` on `businesses` scoped to that ID
- Calls `revalidatePath("/app")` so sidebar name refreshes if business name changes
- Returns `{ error: string } | { success: true }`

### Sidebar — `components/layout/sidebar.tsx`
Add a `Settings` nav item at the bottom of `NAV_ITEMS` using the `Settings` icon from lucide-react, pointing to `/app/settings`.

## Data

No migration needed. All columns (`name`, `abn`, `email`, `phone`, `address`) already exist from `0004_businesses_contact_fields.sql`.

## Acceptance criteria

- Navigating to `/app/settings` shows current values pre-filled
- Saving valid data persists to the `businesses` table
- If business name is changed, the sidebar reflects the new name after save
- Empty optional fields are saved as `null` (not empty string)
- Form shows an error message if the Supabase update fails
- Form shows a success message on successful save
