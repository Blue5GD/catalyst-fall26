# Catalyst Platform: Design System

This file tells you how the Catalyst Platform should look. It is based on the **y/cs Slide Template** (Google Slides, 16:9), so the platform feels like the same program as the kickoff deck and workshop slides.

Follow this file for every page and component. If something isn't covered here, choose the option that looks most like the slide template: flat black surfaces, white type, thin lines and very little color.

---

## 1. Principles

1. **Black canvas, white type.** Every page has a solid black background. There is no light mode.
2. **One accent, used sparingly.** Peach (`#FFB090`) appears in the footer line, on focus rings and on the one thing per screen that needs attention. It is never used as a background fill for large areas.
3. **Flat, not boxed.** Separate content with space and 1px hairlines. Avoid cards with shadows, gradients and large rounded corners.
4. **Big titles, small labels.** The template pairs very large headings with small uppercase labels. Keep that contrast.
5. **Short text.** The template says it directly: "Writing too much in a slide deck will lose your audience's attention." Keep interface text short.

---

## 2. Color

### Tokens

| Token | Hex | Source in template | Use |
|---|---|---|---|
| `--color-bg` | `#000000` | Slide master background | Page background |
| `--color-text` | `#FFFFFF` | All titles and body text | Headings, primary text, names, points |
| `--color-text-secondary` | `#C7C7C7` | Quote marks, attributions | Secondary text, descriptions, captions |
| `--color-text-muted` | `#8A8A8A` | Added for the web | Timestamps, section numbers, placeholder text |
| `--color-number` | `#F3F3F3` | Section-number color (theme "light 2") | Large section numbers, if you want them brighter than muted |
| `--color-line` | `#262626` | Added for the web | Hairline dividers, table rows |
| `--color-slash` | `#3A3A3A` | Grey slash on the title slide | The slash motif, input and button borders |
| `--color-logo` | `#B7B7B7` | y/cs logo image | The logo (use the PNG, don't recolor it) |
| `--color-accent` | `#FFB090` | Footer line on every slide | Footer line, focus rings, primary buttons, "needs attention" |

### Status colors

The template has no status colors. The platform needs a few for review states, so keep them soft so they sit well next to the peach accent. Use them only for small text, dots and outlines, never for large fills.

| Token | Hex | Use |
|---|---|---|
| `--color-success` | `#9ED9A8` | Approved, checked in |
| `--color-danger` | `#FF8F87` | Rejected, errors |
| `--color-pending` | `#FFB090` (same as accent) | Pending review |

### Contrast

All text colors pass WCAG AA on black:

| Color | Contrast on `#000000` |
|---|---|
| `#FFFFFF` | 21:1 |
| `#C7C7C7` | 12.7:1 |
| `#FFB090` | 12.2:1 |
| `#8A8A8A` | 6.1:1 |

Don't use `#3A3A3A` or `#262626` for text. They are for lines and shapes only.

---

## 3. Typography

### Font

Use **DM Sans** for everything, loaded from Google Fonts. (The template also uses DM Mono for its small labels and agenda numbers. The platform uses DM Sans for those too, to keep one family.)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
```

Fallback stack: `"DM Sans", "Helvetica Neue", Arial, sans-serif`

### Weights

| Weight | Name | Use |
|---|---|---|
| 700 | Bold | Page titles and slide titles (the template uses bold for "Agenda," "Closing message" and the 20pt slide titles) |
| 500 | Medium | Section titles, names, labels, buttons, short text. The template sets body text in Medium. |
| 400 | Regular | Long paragraphs on the web, where Medium gets heavy |

### Scale

The template's slide sizes map to these web sizes:

| Role | Template | Web size | Weight | Line height | Letter spacing | Example |
|---|---|---|---|---|---|---|
| Display | 63–90pt title slide, "Agenda," "Closing message" | `clamp(44px, 8vw, 80px)` | 700 | 0.98 | -0.02em | Home page title |
| Section title | 45pt "Section title" and "One key image" | `clamp(30px, 5vw, 44px)` | 500 | 1.05 | -0.01em | Sprint name |
| Section number | 45pt "01" | Same as section title | 400 | 1 | 0 | `01`, `02` |
| Heading | 20pt slide titles | 22px | 700 | 1.2 | 0 | "Leaderboard," "Your group" |
| Subheading | Added for the web | 17px | 500 | 1.3 | 0 | Card or row titles |
| Body | 12pt body copy | 16px | 400–500 | 1.6 | 0 | Paragraphs |
| Small | 12pt descriptions | 14px | 500 | 1.5 | 0 | Table cells, descriptions |
| Label | Uppercase labels ("PLEASE COPY SLIDES AND EDIT," "AGENDA ITEM," "LABEL") | 11–12px, uppercase | 500 | 1.3 | 0.08em | "POINTS," "PENDING REVIEW" |
| Caption | 8pt attribution | 12px | 500 | 1.4 | 0.02em | Timestamps, photo credits |

### Rules

- Use `text-wrap: balance` on headings.
- Keep paragraphs to about 65 characters per line (`max-width: 65ch`).
- Use `font-variant-numeric: tabular-nums` for points, ranks, dates and any column of numbers.
- Use sentence case for headings and buttons. Use uppercase only for labels.

---

## 4. The y/cs mark and the slash

### Logo

- File: `public/ycs-logo.png` (taken from the slide template; grey `#B7B7B7` on a transparent background; 883 × 402 px).
- Size: 32–40px wide in the footer and 48–56px wide in the header.
- Don't recolor, stretch or add effects to it.
- Alt text: `y/cs`.

### Slash motif

The title slide has a large grey slanted bar to the left of the title. Use it only on the **home page** and the **sign-in page**.

```css
.slash {
  width: 72px;
  height: 180px;
  background: var(--color-slash);
  clip-path: polygon(38% 0, 100% 0, 62% 100%, 0 100%);
}
```

On phones, shrink it to about 44 × 110px and place it above the title.

---

## 5. Layout

### Page frame

- Content max width: **1040px** for app pages and **720px** for reading pages (sprint content, guides).
- Side gutter: **24px** on desktop and **16px** on phones.
- Vertical rhythm between major sections: **72px** on desktop and **48px** on phones.
- Base spacing unit: **4px**. Use this scale: 4, 8, 12, 16, 24, 32, 48, 72, 96.

### Footer (every page)

The template puts a 1.5pt peach line across the bottom of every slide, with the y/cs logo below it on the left. The platform does the same:

```
─────────────────────────────────────────────  ← 1px solid --color-accent, full content width
[y/cs logo]                       Catalyst · Fall 2026
```

- Line: `border-top: 1px solid var(--color-accent)`.
- Padding: 14px above the content and 32px below.
- Right side: small label text in `--color-text-muted`.

### Header

- Left: the y/cs logo, followed by the label "CATALYST."
- Right: nav links (Sprint, Group, Leaderboard, Members) in 14px Medium `--color-text-secondary`. The current page's link is `--color-text` with a 1px peach underline.
- Admin link: shown only to admins, with a small peach dot when submissions are waiting for review.
- No background fill or bottom shadow. Use a `--color-line` hairline below the header if it needs separating.
- On phones, collapse the nav into a "Menu" button that opens a full-screen black overlay.

---

## 6. Page layouts, mapped to slides

Each screen uses a layout from the template.

| Screen | Slide layout | Notes |
|---|---|---|
| Home | **Title slide** | Slash plus "Catalyst" in display type. Label below: "FALL 2026 · SPRINT 2 OF 5." Then the current sprint and your points. |
| Sign in | **Title slide** | Slash plus "Catalyst," then one button: "Sign in with Yale Google." |
| Sprint page | **Section title** | Large number (`01`–`05`) on the left, sprint name on the right, one-line description below in `--color-text-secondary`. Then the content in reading width. |
| Sprint list | **Agenda** | Numbered rows (`01`, `02`, `03`) with sprint names in label style, as on the agenda slide. |
| Group page | **Three- or four-column layout** | One column per member (photo and name). |
| Profile | **Image with text** | Photo on the right half, name and details on the left. On phones, the photo goes on top. |
| Leaderboard | **Slide title + body** | Heading, then a table with hairline rows. |
| Members | **Three-column layout with images** | Grid of photos with names below. Four columns on desktop, two on phones. |
| Showcase | **Laptop device frame** | Project screenshot with up to three one-sentence feature lines beside it. |
| Check-in confirmation | **One key image with short text** | Full-screen black, label "CHECKED IN," then "+1 point" in section-title size. |
| Demo Day or end of sprint | **Closing message** | Big bold message and one line of next steps. |

---

## 7. Components

### Section header

```
01   Personal website
     Sep 28 – Oct 11 · Led by Eli · Sponsored by SpaceXAI and Cursor
```

- Grid: `64px 1fr` on desktop and `44px 1fr` on phones, with a 16px gap.
- The number is section-title size, weight 400, `--color-text-muted` (or `--color-number` for more contrast).
- Use numbers only when the order means something (sprints, steps). Don't number sections just for decoration.

### Buttons

| Type | Style |
|---|---|
| Primary | Background `--color-accent`, text `#000000`, weight 500, 14px, padding 10px 18px, radius 4px |
| Secondary | Transparent, 1px `--color-slash` border, text `--color-text`, same size |
| Text | No border, `--color-text`, underline on hover, with the underline in `--color-accent` |
| Destructive | Secondary style with `--color-danger` text |

- Use one primary button per screen at most.
- Hover: primary gets slightly lighter (`#FFC2A8`), and secondary's border becomes `--color-text-secondary`.
- Focus: `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- Disabled: 40% opacity with `cursor: not-allowed`.
- Button text says exactly what happens: "Approve," "Reject," "Upload photo," "Check in."

### Form fields

- Background `--color-bg`, 1px `--color-slash` border, radius 4px, padding 10px 12px, 16px text (16px also prevents zoom on iPhone).
- The label sits above the field in label style.
- Focus: the border changes to `--color-accent`.
- Error: a `--color-danger` border, plus a message below the field that says what's wrong and how to fix it.

### Tables (leaderboard, points history)

- No outer border and no row fills.
- Header cells use label style in `--color-text-muted`, with a 1px `--color-line` bottom border.
- Rows have a 1px `--color-line` bottom border and 12px vertical padding.
- Rank and points are right-aligned with tabular numbers.
- The signed-in user's row gets a 2px `--color-accent` bar on the left edge.
- On phones, wrap wide tables in a horizontal scroll container rather than squeezing them.

### Status pills

Small inline tags for submission state:

- 11px label style, padding 2px 8px, 1px border, radius 3px, transparent background.
- The border and text color come from the status token: pending = accent, approved = success, rejected = danger.
- Always include the word ("Pending," "Approved," "Rejected"), not only the color.

### Points change

- Show changes as `+1` or `−2` in tabular numbers.
- Positive changes use `--color-text`, and negative ones use `--color-text-secondary`.
- After a new award, the number briefly fades from accent to white (300ms). Skip this animation when `prefers-reduced-motion` is set.

### Photo upload

- A dashed 1px `--color-slash` drop area with the label "DRAG A PHOTO OR TAP TO CHOOSE" and a category picker below ("Group gathering," "Submitting work").
- After upload: a thumbnail, a "Pending" pill and the line "An admin will review this. The photo is deleted after review."

### Review queue (admin)

- One submission per row: the photo on the left (max 240px wide), and the submitter, group, category and time on the right.
- Two buttons: "Approve" (primary) and "Reject" (secondary).
- After a decision, the row collapses and a toast confirms, for example: "Approved. +1 to Group 4. Photo deleted."
- The waiting count in the header uses the accent color.

### QR check-in screen (admin, projected)

- Full-screen black with the QR code centered, drawn white on black with a quiet zone of at least 4 modules.
- Above the code: the session name in heading style. Below it: "Scan to check in" and a countdown to the next code in `--color-text-muted`.
- A live count of check-ins in the bottom-right corner, in section-title size.

### Toasts

- Bottom center on phones and bottom right on desktop.
- Black background, 1px `--color-slash` border, 14px text.
- They disappear after 4 seconds, and screen readers announce them with `role="status"`.

### Empty states

Use one short sentence and one action. For example: "No submissions yet. Upload a group photo to earn a point."

---

## 8. Imagery

- Member photos: square, cropped to fill, radius 4px.
- Group photos in review: show the original aspect ratio, contained within a black frame.
- Project screenshots: 16:10, with a 1px `--color-line` border.
- Don't use stock photos, illustrations or emoji in the interface.
- Use outline icons (1.5px stroke, `currentColor`) only where a word won't fit. Label icon-only buttons with `aria-label`.

---

## 9. Motion

- Keep motion minimal. The template has no animation.
- Hover and focus transitions: 150ms ease-out on color and border only.
- No page-load animation, parallax or scrolling effects.
- Respect `prefers-reduced-motion: reduce` by turning off all non-essential transitions.

---

## 10. Accessibility

- Every interactive element has a visible focus ring in the accent color.
- Tap targets are at least 44 × 44px on phones.
- Every flow works at a width of 375px, especially check-in and photo upload, which people use on their phones.
- Status is never shown by color alone.
- All images have alt text. For member photos, use the person's name.
- Use semantic HTML (`header`, `nav`, `main`, `footer`, `table`), with headings in order.

---

## 11. Starter CSS

Put this in `src/styles/global.css` and import it in the base layout.

```css
:root {
  color-scheme: dark;

  /* Color */
  --color-bg: #000000;
  --color-text: #ffffff;
  --color-text-secondary: #c7c7c7;
  --color-text-muted: #8a8a8a;
  --color-number: #f3f3f3;
  --color-line: #262626;
  --color-slash: #3a3a3a;
  --color-accent: #ffb090;
  --color-accent-hover: #ffc2a8;
  --color-success: #9ed9a8;
  --color-danger: #ff8f87;

  /* Type */
  --font-sans: "DM Sans", "Helvetica Neue", Arial, sans-serif;
  --text-display: clamp(44px, 8vw, 80px);
  --text-section: clamp(30px, 5vw, 44px);
  --text-heading: 22px;
  --text-subheading: 17px;
  --text-body: 16px;
  --text-small: 14px;
  --text-label: 11.5px;
  --text-caption: 12px;

  /* Space */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 72px;
  --space-9: 96px;

  /* Shape */
  --radius: 4px;
  --line: 1px solid var(--color-line);

  /* Layout */
  --width-app: 1040px;
  --width-read: 720px;
  --gutter: 24px;
}

@media (max-width: 720px) {
  :root { --gutter: 16px; }
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: 1.6;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

body { padding-inline: var(--gutter); }

h1, h2, h3, h4 {
  color: var(--color-text);
  margin: 0;
  text-wrap: balance;
}
h1 { font-size: var(--text-display); font-weight: 700; line-height: 0.98; letter-spacing: -0.02em; }
h2 { font-size: var(--text-section); font-weight: 500; line-height: 1.05; letter-spacing: -0.01em; }
h3 { font-size: var(--text-heading); font-weight: 700; line-height: 1.2; }
h4 { font-size: var(--text-subheading); font-weight: 500; line-height: 1.3; }

p { margin: 0; max-width: 65ch; }

a { color: var(--color-text); text-decoration-color: var(--color-accent); text-underline-offset: 3px; }

:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

.label {
  font-size: var(--text-label);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.num { font-variant-numeric: tabular-nums; }

.container { max-width: var(--width-app); margin-inline: auto; }
.container--read { max-width: var(--width-read); margin-inline: auto; }

.site-footer {
  border-top: 1px solid var(--color-accent);
  margin-top: var(--space-9);
  padding-block: 14px var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}
.site-footer img { width: 36px; height: auto; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

---

## 12. Checklist for every new page

- [ ] Black background, with no light surfaces.
- [ ] DM Sans only, using the type scale above.
- [ ] Peach used in the footer line and at most one other place on the screen.
- [ ] Footer with the peach line and the y/cs logo.
- [ ] Layout matches a slide from section 6.
- [ ] No shadows, gradients or large radii.
- [ ] Works at 375px wide, with no sideways scrolling.
- [ ] Visible focus states, and status isn't shown by color alone.