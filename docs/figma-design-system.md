# APIAutopsy Figma-Ready Design System

## Product Direction

APIAutopsy is a professional API testing and monitoring workspace. The UI should feel familiar to Postman users while using a distinct APIAutopsy identity: cooler blue/indigo accents, crisp white workspace panels, and restrained dark surfaces only where helpful.

## Pages

### 1. Dashboard Layout

Frame: `Dashboard / API Lab`

- Global top bar with navigation, search, invite, settings, notifications, profile.
- Left icon rail: Collections, Environments, Scheduler, Flows, History, Settings.
- Collections sidebar: workspace switcher, New, Import, collection search, expandable collection tree.
- Main panel:
  - Request tabs
  - Request header with breadcrumb, request title, environment selector, Save, Share
  - Method + URL + Send row
  - Request tabs: Params, Headers, Body, Auth
  - Response viewer with status, time, result, body, headers

### 2. Scheduler Page

Frame: `Dashboard / Scheduler`

- Table columns: API name, Schedule, Status, Last run, Success rate.
- Primary action: Create Schedule.
- Modal:
  - Select API
  - Schedule name
  - Simple interval dropdown
  - Advanced cron option
  - Enable immediately toggle

### 3. Settings Page

Frame: `Dashboard / Settings`

- Security card:
  - SSL verification toggle
  - Certificate name
  - Certificate PEM textarea
  - Private key textarea
- API Keys card:
  - Explain request-scoped encrypted auth
- Workspace card:
  - Workspace name
  - Invite guidance

## Design Tokens

### Colors

```text
Background / dark reference: #0C0C0C
Surface: #FFFFFF
Subtle surface: #F8FAFC
Border: #E5E7EB
Primary: #6366F1
Primary active: #2563EB
Teal accent: #0F766E
Text primary: #111827
Text secondary: #4B5563
Text muted: #9CA3AF
Dark text reference: #E5E7EB
Success: #12805C
Danger: #C7352B
Warning: #B45309
```

### Typography

```text
Font family: Inter
Base: 14px / 20px
Small: 12px / 16px
Section heading: 16px / 24px, semibold
Page heading: 20px / 28px, semibold
Code: JetBrains Mono or ui-monospace
```

### Spacing

```text
4px micro
8px compact controls
12px field rhythm
16px cards
20px page section
24px major page gutters
```

## Components

### Buttons

- Primary: blue filled, white text, 6px radius.
- Secondary: white or subtle gray, border, dark text.
- Ghost: no border, text only, hover background.
- Destructive: red border or red filled for irreversible actions.

### Inputs

- Height: 40px.
- Border: #E5E7EB.
- Focus: #2563EB.
- Background: white in main panels, #F8FAFC in subtle controls.

### Tabs

- Horizontal text tabs.
- Active state: 2px primary bottom border.
- Inactive: muted text, hover darkens.

### Sidebar

- 74px icon rail.
- 330px collections panel.
- Active item: subtle blue background.
- Method labels use primary blue.

### Cards

- 1px border.
- 6px radius.
- Minimal shadows only for modals.

## UX Rules

- Keep scheduler separate from ad hoc request testing.
- Prefer dropdowns and toggles over raw cron.
- Avoid marketing language inside the tool surface.
- Keep actions close to their object: Send near URL, Save/Share near title.
- Never show fake controls; route them to real backend flows or remove them.
