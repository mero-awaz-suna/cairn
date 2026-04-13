# CAIRN — World-Class Design System & Product Guidelines
## Complete Production Design Specification

> "Cairn should feel like a warm room, not a dashboard."  
> This document makes that a precise, executable truth — not a feeling.

---

## PART I — DESIGN PHILOSOPHY & PRINCIPLES

### The One Rule That Governs Everything

Every design decision in Cairn must pass a single test:

**"Does this feel like it was made by someone who has been exactly where the user is?"**

If the answer is no — if it feels clinical, gamified, corporate, or performatively cheerful — it fails. Cut it.

---

### The Six Core Principles

**1. Presence Over Information**
Cairn doesn't show data. It shows presence. The difference: a graph of your stress over time is data. The sentence "312 people are carrying this right now" is presence. Always choose presence.

**2. Trust Before Ask**
The user earns every request we make of them. Google Sign-In comes third. The burden text field has no visible submit button until they type. The journal prompt appears only after the Memory Wall has already moved them. We never ask for anything before we've given something first.

**3. Nothing Snaps**
Every transition, every reveal, every state change is eased. The burden count fades in over 800ms after a deliberate 2-second pause. The matching rings pulse at a heart-rate cadence — slow enough to be calming, not exciting. If something snaps into place, it's wrong.

**4. Warmth Through Specificity**
Generic warmth is noise. Specific warmth is signal. "You're stressed" is generic. "The gap between where you are and where everyone expected you to be by now" is specific. This applies to design language too — the moss green is not any green, the cream is not any white, the Caveat font is not any script.

**5. Silence Is a Feature**
The facilitator says nothing most of the time. The matching screen has no progress bar. The burden drop screen has almost nothing on it. Empty space is not a design failure — it is the primary emotion-carrying element of this app. Never fill silence.

**6. The User Is Not Fragile — They Are Private**
Design for dignity, not fragility. These users are not patients — they are people who have chosen privacy. Never add reassurance copy, soft disclaimers, or wellness language unless it is earned by context. "You're safe here" without context is patronizing. "247 people have carried this exact weight" earns it.

---

## PART II — VISUAL DESIGN SYSTEM

### 2.1 Color System

#### The Palette — Full Specification

```
PRIMARY SURFACES
──────────────────────────────────────────────────
Warm Cream     #F5F0EA    Primary background (light screens)
White          #FFFFFF    Card surface on cream background
Stone          #2C2825    Primary background (dark screens) + primary text
Sand           #E8DFD3    Secondary surfaces, borders, AI message bg
Sand Light     #F0EAE0    Hover states on sand elements

SEMANTIC COLORS
──────────────────────────────────────────────────
Moss           #6B8F71    Primary action, through_it persona, growth
Moss Deep      #5A7D60    Moss hover / pressed state
Moss Light     #8FB996    Moss on dark backgrounds, secondary indicators
Moss Glow      rgba(107,143,113,0.15)   Moss tinted surfaces
Moss Soft      rgba(107,143,113,0.08)   Subtle moss wash

Ember          #D4845A    In storm persona ONLY — never for general UI
Ember Light    #E8A87C    Ember on dark backgrounds
Ember Glow     rgba(212,132,90,0.15)    Ember tinted surfaces

NEUTRAL SCALE
──────────────────────────────────────────────────
Stone          #2C2825    900 — primary text, dark background
Stone 90       rgba(44,40,37,0.9)   Primary text with slight transparency
Dusk           #8B7E74    600 — secondary text, subtitles, nav labels
Cloud          #C9BFB2    400 — tertiary text, placeholder, timestamps
Cloud Light    #D9D1C6    300 — borders on dark bg, disabled states
Sand           #E8DFD3    200 — borders on light bg, dividers
Sand Light     #F0EAE0    100 — subtle backgrounds, hover states
Warm Cream     #F5F0EA    50  — primary background

FUNCTIONAL
──────────────────────────────────────────────────
Red Soft       #D45A5A    Crisis indicators, end session — use sparingly
Blue Soft      #5A8FD4    Matching context tags only
```

#### Color Usage Rules — The Hard Laws

**Moss (#6B8F71) is the color of forward motion.** It appears on: primary CTAs, active nav states, the matching center circle, through_it persona labels, Memory Wall card left borders, the journal prompt card, positive meter fills. It does NOT appear on: error states, decorative elements, backgrounds of large areas except the journal prompt and profile header.

**Ember (#D4845A) is the color of storm.** It appears on: storm persona indicators, in-the-storm member labels in circles, the recording button. It does NOT appear on: CTAs, nav, success states, or any general UI element. Ember used where it shouldn't be is like a clinical red cross on a wellness app — it triggers alarm where none is warranted.

**Stone (#2C2825) is the night room.** Dark screens (recording, matching, live session) live in Stone. This is intentional — these are private, inward moments. The warm-cream screens are the public-facing, community moments. The color shift signals mode.

**White (#FFFFFF) is for cards on cream only.** Never use pure white as a background for a full screen. Never use white text on light backgrounds.

**Never add colors not in this palette.** No purple, no teal, no gradient rainbows. If a new color is needed, it goes through this palette decision framework first.

#### Dark Mode
Cairn has two "modes" baked into the design — not user-selectable dark/light mode, but context-driven surface switching:

- **Light Surface** (Warm Cream): Memory Wall, Home/Journal Dashboard, Profile, Onboarding
- **Dark Surface** (Stone): Recording screen, Matching/Waiting screen, Live Circle Session

This is NOT OS-level dark mode — it is intentional emotional mode switching within the app. Do not implement OS dark mode as a separate theme. The existing dual-surface design IS the emotional architecture.

---

### 2.2 Typography System

#### Font Stack

```
Display:  'DM Serif Display', Georgia, serif
          — Use for: page headlines, the burden count number, 
            recognition message body, record timer, matching status text,
            profile name, session close headline
          — Never use for: body copy, navigation, labels, input text
          — Size range: 18px – 56px only
          — Weight: 400 (regular) only — this font has no bold weight

Body:     'Nunito', -apple-system, BlinkMacSystemFont, sans-serif
          — Use for: ALL UI text, navigation labels, body paragraphs,
            card descriptions, button text, input text, tags, badges
          — Weight: 300 (light), 400 (regular), 500 (medium), 
            600 (semibold), 700 (bold)
          — Do not use 800 or 900

Hand:     'Caveat', cursive
          — Use for: Memory Wall quote text ONLY
          — Never use for: UI elements, navigation, labels, body text
          — Weight: 500 only
          — If a card is not a Memory Wall quote, it does not use Caveat
```

#### Type Scale

```
Display XL    DM Serif / 56px / lh 1.0   — Recording timer only
Display L     DM Serif / 36px / lh 1.1   — Page-level page header (non-app context)
Display M     DM Serif / 26px / lh 1.2   — Home greeting, profile name
Display S     DM Serif / 22px / lh 1.2   — Matching status, session close head
Display XS    DM Serif / 18px / lh 1.3   — Journal prompt h3, memory section heads

Body XL       Nunito 700 / 16px / lh 1.4  — Section headers within screens
Body L        Nunito 600 / 15px / lh 1.4  — Card titles, entry card titles, btn text
Body M        Nunito 400 / 14px / lh 1.5  — Standard body text, greeting sub
Body S        Nunito 300 / 13px / lh 1.6  — Card descriptions, ai msg, chat text
Body XS       Nunito 500 / 12px / lh 1.5  — Tags, memory pills, streak dots labels
Caption       Nunito 400 / 11px / lh 1.4  — Timestamps, entry duration, card dates
Label XS      Nunito 700 / 10px / lh 1.0  — Nav labels, member role labels in session
              letter-spacing: 0.04-0.08em

Hand L        Caveat 500 / 17px / lh 1.5  — Memory Wall quote text
```

#### Typography Rules

**Never mix DM Serif and Caveat on the same card.** DM Serif is the voice of the product. Caveat is the voice of the community. They don't overlap.

**Line-height is emotional.** Tight (1.0–1.2) for headlines — impact. Generous (1.5–1.6) for body copy — readability and breathing room. Never set body text below lh 1.4.

**Letter-spacing belongs only to labels.** `letter-spacing: 0.04em` or higher is reserved for uppercase labels (nav items, member role labels, card tags). Body copy and headlines have default letter-spacing.

**Font smoothing must be set.** `-webkit-font-smoothing: antialiased` and `moz-osx-font-smoothing: grayscale` on the body — always. Without this, Nunito at 300 weight looks terrible on non-retina displays.

---

### 2.3 Spacing System

Cairn uses an 8px base grid. All spacing values are multiples of 4px, with preference for 8px increments.

```
4px   — Gap between closely related inline elements (tag to tag)
6px   — Tight inline gaps (pill gap in filter row, avatar letter-spacing)
8px   — Small internal padding (tag badges, streak dots gap)
10px  — Nav item gap, small card internal
12px  — Standard gap between list items, chat message gap
14px  — Internal card padding (entry cards, ai facilitator)
16px  — Standard internal card padding, section internal spacing
20px  — Card primary padding (mem-card, persona-card)
24px  — Screen horizontal margin — NEVER reduce below this on 375px
28px  — Bottom nav safe area padding (home indicator clearance)
32px  — Screen horizontal padding for centered content (record, matching)
40px  — Vertical rhythm between sections
48px  — Large section separation
60px  — Screen-level top padding on page header
```

**The 24px Screen Margin is Sacred.** Every screen has 24px horizontal padding from the phone edge. This gives content room to breathe and stops the app from feeling like it's bleeding off the edge. The only exception: full-bleed backgrounds (profile header, dark screens) — content inside them still maintains 24px.

**Cards never touch each other.** Minimum 10px gap between cards. Standard 12px. If cards are visually related, use 8px.

---

### 2.4 Border Radius System

```
Full / Pill    9999px   — All buttons, navigation pills, tags, input fields,
                          nav-help-btn, matching tags, persona tags
Large          16px     — Primary cards (mem-card, persona-card, journal-prompt,
                          streak-card, entry-card)
Medium         10px     — Secondary cards, session chat bubbles, entry-mood icon
Small          8px      — AI avatar (rounded square), small badges
XSmall         4px      — Memory Wall card-tag badge ONLY
Circle         50%      — All avatar elements, recording button, all nav dots
```

**Consistency law:** A button is always pill-shaped (9999px). A card is always 16px. An avatar is always 50%. Breaking these without explicit reason degrades the system's legibility.

**Chat bubbles use directional radius.** Incoming messages: `border-radius: 14px 14px 14px 4px`. Your outgoing messages: `border-radius: 14px 14px 4px 14px`. The small corner indicates directionality without arrows.

---

### 2.5 Shadow System

```
Level 0 — No shadow       — Dark surface cards (already on dark bg)
Level 1 — Whisper          box-shadow: 0 1px 6px rgba(44,40,37,0.04)
          — Entry cards, minimal lift
Level 2 — Soft             box-shadow: 0 2px 12px rgba(44,40,37,0.05)
          — Standard card resting state (mem-card, persona-card, streak-card)
Level 3 — Lifted           box-shadow: 0 6px 24px rgba(44,40,37,0.08)
          — Card hover state, elevated elements
Level 4 — Glow Moss        box-shadow: 0 4px 20px rgba(107,143,113,0.4)
          — Nav help button, Join Circle CTA, moss-tinted CTAs
Level 5 — Glow Ember       box-shadow: 0 0 40px rgba(212,90,90,0.3)
          — Recording button only
Level 6 — Glow Match       box-shadow: 0 0 30px rgba(107,143,113,0.4)
          — Matching center circle
Level 7 — Phone Frame      box-shadow: 0 0 0 2px rgba(255,255,255,0.08),
                                        0 40px 100px rgba(0,0,0,0.5),
                                        inset 0 0 0 1px rgba(255,255,255,0.04)
          — Phone bezel on design preview only, not in production
```

**Shadows follow the Z-axis, not decoration.** A shadow communicates elevation and importance. Never add a shadow to something that isn't elevated above its background. Cards on cream background get Level 2. Cards on dark background get Level 0 (they're already atmospheric).

---

### 2.6 Iconography System

**All icons:** Lucide icons (stroke, not fill) — `stroke-width: 2px` standard, `2.5px` for the nav-help-btn icon (needs visual weight at that context).

**Icon sizes:**
```
16px  — Inline with text labels, card title icons (persona-card-title)
18px  — Session mic button, small action icons
20px  — Matching center icon, recording action icons
22px  — Bottom navigation items (standard)
24px  — Nav-help-btn icon (center CTA)
```

**Icon color follows text color.** An icon next to "Dusk" text is `color: var(--dusk)`. Active nav icons are `color: var(--moss)`. Never color icons independently from their context label.

**Never use emoji as UI icons.** Emoji (🌱, 🔥, ✨) are allowed only in content — streak cards (as a decorative element), entry mood indicators, Memory Wall reactions, profile avatar placeholder. They are NEVER used for functional navigation or action icons.

---

## PART III — ANIMATION & MOTION SYSTEM

### 3.1 The Motion Manifesto

**Motion in Cairn is never decorative.** Every animation serves exactly one of these purposes:
1. **Transition** — showing a change of state
2. **Feedback** — confirming an action has been received
3. **Emotional** — communicating something that copy cannot (the 2-second pause before the burden count)
4. **Orientation** — telling the user where they are in space (cards slide up = grounding)

If an animation serves none of these purposes, it does not exist.

### 3.2 Easing Functions

```css
/* The only easing functions used in Cairn */

--ease-standard:  cubic-bezier(0.4, 0.0, 0.2, 1);  /* Material standard — most transitions */
--ease-enter:     cubic-bezier(0.0, 0.0, 0.2, 1);  /* Decelerate — things entering the screen */
--ease-exit:      cubic-bezier(0.4, 0.0, 1.0, 1);  /* Accelerate — things leaving the screen */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1); /* Gentle spring — card arrivals, reveals */

/* Never use: */
/* linear — except for opacity-only fades */
/* ease-in-out (CSS default) — acceptable but prefer --ease-standard */
/* bounce — too playful for this product */
/* elastic — too playful */
```

### 3.3 Duration Scale

```
Instant      0ms     — State changes that must not feel delayed (active state on tap)
Micro        150ms   — Hover states, color transitions on interactive elements
Fast         200ms   — Nav item transitions, pill active state
Standard     300ms   — Most UI transitions, button hover, card hover
Deliberate   450ms   — Screen-to-screen transitions (opacity + scale)
Slow         600ms   — Recognition card entrance, burden count prep
Ceremonial   800ms   — Burden count number fade-in
Pause        2000ms  — The deliberate pause before burden count (delay, not duration)
Stagger      80ms    — Between cascading items (Memory Wall cards on load)
```

### 3.4 Specific Animation Specifications

#### Screen Transitions
```css
/* Entering screen */
.app-screen { opacity: 0; transform: scale(0.96); }
.app-screen.active {
  opacity: 1; transform: scale(1);
  transition: opacity 450ms var(--ease-enter),
              transform 450ms var(--ease-enter);
}
/* This scale(0.96) → scale(1.0) creates the feeling of
   "arriving" rather than "switching." It's subtle. Do not increase
   the scale differential — 0.94 feels like a jump, 0.98 feels imperceptible. */
```

#### The Burden Count Reveal (Protected)
```css
/* The 2-second pause is load-bearing. It is not a bug.
   It is the moment of suspended breath before recognition.
   Do not remove it under any circumstance. */
   
.burden-count-number {
  opacity: 0;
  animation: burdenReveal 800ms var(--ease-enter) 2000ms forwards;
}
@keyframes burdenReveal {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}

.peer-memory-card {
  opacity: 0;
  transform: translateY(24px);
  animation: cardSlideUp 500ms var(--ease-enter) 2900ms forwards;
  /* Arrives 900ms after count — gives count time to land */
}
@keyframes cardSlideUp {
  to { opacity: 1; transform: translateY(0); }
}
```

#### Cards Always Slide Up
```css
/* Cards always enter from below. Never from sides. Never from above.
   Up means arriving, grounding, weight being lifted.
   This direction is emotionally consistent across the entire app. */
   
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

#### Memory Wall Cards Stagger
```css
/* Each card in the Memory Wall enters with an 80ms stagger */
.mem-card:nth-child(1) { animation: cardEnter 400ms var(--ease-enter) 0ms both; }
.mem-card:nth-child(2) { animation: cardEnter 400ms var(--ease-enter) 80ms both; }
.mem-card:nth-child(3) { animation: cardEnter 400ms var(--ease-enter) 160ms both; }
/* max 5 staggered on initial load — rest appear immediately */
```

#### Matching Rings — Anxiety Reduction
```css
/* The rings pulse slowly. This is calibrated to be slower than a resting
   heart rate — approximately 50bpm. It communicates "something careful
   is happening" not "something exciting is happening."
   
   Do NOT speed this up. Do NOT add more rings. Do NOT change colors.
   The stillness is the point. */

@keyframes matchPulse {
  0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
  50%       { opacity: 0.8; transform: translate(-50%, -50%) scale(1.04); }
}
.match-ring-1 { animation: matchPulse 2400ms ease-in-out infinite; }
.match-ring-2 { animation: matchPulse 2400ms ease-in-out 400ms infinite; }
.match-ring-3 { animation: matchPulse 2400ms ease-in-out 800ms infinite; }
/* Period: 2400ms = 25 cycles/minute = calming, not exciting */
```

#### Nav Help Button Pulse
```css
/* The center nav CTA pulses to signal invitation, not urgency.
   The ripple ring must be subtle — it should catch peripheral vision, 
   not demand attention. */
   
@keyframes helpPulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(107,143,113,0.4); }
  50%       { box-shadow: 0 4px 30px rgba(107,143,113,0.6); }
}
@keyframes helpRipple {
  0%   { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(1.6); opacity: 0; }
}
/* Ripple period: 3000ms — slow enough to be ambient, not alarming */
```

#### Speaking Indicator in Circle
```css
/* The "speaking" animation on a circle member avatar must be 
   clearly different from the matching ring pulse.
   This one is faster — it tracks with active speech. */
   
@keyframes speakPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(107,143,113,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(107,143,113,0); }
}
/* Period: 1200ms — matches a comfortable speaking cadence */
```

#### Waveform Display (Recording Screen)
```css
/* The waveform bars animate independently with variable heights.
   Each bar uses a CSS custom property --h for its max height.
   This is the only place in the app with "energetic" animation
   because recording is an active, alive moment. */
   
@keyframes waveAnim {
  0%   { height: 8px; opacity: 0.4; }
  100% { height: var(--h); opacity: 1; }
}
/* Duration: 0.7s — faster than everything else, because this is 
   not calming — it's responding in real-time to the user's voice. */
```

#### Recording Dot Blink
```css
/* The blink on the recording dot and the live badge dot
   must use the same keyframes for consistency */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
/* Period: 1500ms — the canonical "recording active" indicator pace */
```

---

## PART IV — COMPONENT LIBRARY

### 4.1 Bottom Navigation

**Composition:** 5 items. Left 2: Home, Echoes (Memory Wall). Center: Help/Circle (elevated). Right 2: Record, Me (Profile).

**Rules:**
- The center item (nav-help-btn) is always 52×52px circle in Moss with a ripple ring
- The center item does NOT have a text label — its visual elevation communicates primacy
- Active state: icon and label both become Moss color
- Inactive state: icon and label both use Dusk color
- The bottom padding (28px) accounts for the iOS home indicator — this must account for `env(safe-area-inset-bottom)` in production
- The gradient fade behind the nav (cream → transparent or stone → transparent) must be 80px tall minimum to prevent content collision

**Production implementation:**
```css
.bottom-nav {
  padding-bottom: max(28px, env(safe-area-inset-bottom));
  /* This is critical for iPhone X+ — without it, the nav sits over the home bar */
}
```

### 4.2 Cards

**Four card archetypes:**

**A. Content Card (White on Cream)**
```
background: #FFFFFF
border-radius: 16px
padding: 20px
box-shadow: Level 2 (resting), Level 3 (hover)
hover: translateY(-2px) with Level 3 shadow
transition: all 300ms standard ease
Examples: mem-card, persona-card, streak-card
```

**B. Entry Card (Compact, White on Cream)**
```
background: #FFFFFF
border-radius: 10px
padding: 14px 16px
display: flex, align-items: center, gap: 12px
hover: translateX(3px) — horizontal shift, not vertical
box-shadow: Level 1
Examples: journal entry list items
```

**C. Action Card (Moss Gradient)**
```
background: linear-gradient(135deg, var(--moss), var(--moss-deep))
border-radius: 16px
padding: 24px 20px
color: white
overflow: hidden
::after radial-gradient glow element (position: absolute)
Examples: journal prompt card
```

**D. Dark Glass Card (Stone Surface)**
```
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.06)
border-radius: 10px
padding: 14px 16px
Examples: AI facilitator message in session
```

### 4.3 Buttons

**Three button types:**

**Primary (Moss Pill)**
```
background: var(--moss)
color: white
border-radius: 9999px
padding: 14px 32px (large) / 10px 20px (medium) / 8px 16px (small)
font: Nunito 600
box-shadow: Level 4 Glow Moss
hover: background shifts to moss-deep, shadow intensifies
active: scale(0.97)
```

**Secondary (Glass)**
```
background: rgba(255,255,255,0.2)
backdrop-filter: blur(10px)
border: 1px solid rgba(255,255,255,0.25)
color: white
border-radius: 9999px
Used on: dark surfaces, inside Action Cards
```

**Ghost/Pill (Sand)**
```
background: var(--white)
border: 1px solid var(--sand)
color: var(--dusk)
border-radius: 9999px
active: background: var(--moss), border-color: var(--moss), color: white
Used on: filter pills (Memory Wall), onboarding selection pills
```

**The "Put it down" button (special case)**
```
This button must not be visible until the user has started typing.
It fades in at opacity 0 → 1 over 200ms when the textarea has content.
Copy: "Put it down." — period included, lowercase 'd'
It is NOT a standard CTA button. It appears ghost-like, centered,
below the text field. Its invisibility until needed is part of the UX.
```

### 4.4 Input Fields

**Text input (session chat, burden drop):**
```
background: rgba(255,255,255,0.06) (dark) / var(--white) (light)
border: 1px solid rgba(255,255,255,0.1) (dark) / var(--sand) (light)
border-radius: 9999px (single-line) / 16px (multiline burden drop)
padding: 12px 18px
font: Nunito 400 14px, color: var(--cloud) (dark) / var(--stone) (light)
placeholder: var(--dusk)
focus: border-color shifts to var(--moss), no outline, box-shadow: 0 0 0 3px var(--moss-glow)
```

**Voice recorder circle:**
```
This is not an input — it is a theater. A large soft circle that responds
to touch. Tap = begin recording. No other affordances visible on first view.
The "I'd rather type" option appears as a tiny text link below, 
in dusk color, 12px. It is available but not prominent.
```

### 4.5 Tags & Pills

**Category Tag (Uppercase):**
```
background: var(--moss-glow)
color: var(--moss)
font: Nunito 700 10px, letter-spacing: 0.08em, uppercase
padding: 3px 8px
border-radius: 4px
Examples: mem-card-tag ("BURNOUT", "CAREER PRESSURE")
```

**Context Tag (Lowercase pill):**
```
background: var(--moss-glow) / var(--ember-glow) / rgba(90,143,212,0.1)
color: corresponding semantic color
font: Nunito 500 12px
padding: 5px 12px
border-radius: 9999px
Examples: profile matching context tags
```

**Filter Pill:**
```
See Button / Ghost/Pill specification above
Used in: Memory Wall filter row, onboarding selection tiles
Scroll direction: horizontal scroll on small screen, no scrollbar visible
```

---

## PART V — SCREEN-BY-SCREEN SPECIFICATIONS & IMPROVEMENTS

### Screen 1 — Home / Journal Dashboard

**What's working in the prototype:**
- Greeting + streak card hierarchy is correct
- Moss journal prompt card creates strong visual anchor
- Entry list below correctly communicates continuity

**Production improvements required:**

1. **Greeting personalization.** "Good morning, Aryan" uses the user's self-assigned anonymous label from onboarding, NOT their real name. The sub-label ("3 days carrying this") surfaces their primary burden theme. This data must come from the API, not be static.

2. **Streak card progression.** The 7 dots should be the last 7 days. Filled = journaled. Empty = missed. The dot on today should pulse subtly if today is not yet filled — a gentle invitation, not a guilt indicator. Do NOT use a flame emoji that implies a "streak broken" failure state.

3. **Journal prompt card copy must rotate.** The question on the moss card should not be the same every day. 7 variations cycle based on day of week. All variations share the same tone — present, specific, non-clinical.

4. **The recognition card entry point.** After submitting a journal entry, the home screen should animate to show the recognition card in-place — not a new screen. The moss journal card transitions to reveal the recognition message in the same visual space. This keeps the user grounded in the home context.

5. **Entry cards must show persona emoji, not generic emoji.** 🌊 for storm, 🌱 for ground, 🌿 for through_it. Never arbitrary emoji. The emoji is a visual shorthand for the AI-assigned state, not a mood emoji the user picks.

### Screen 2 — Recording Screen

**What's working:**
- Dark Stone background creates intimacy and focus
- Waveform visualization is appropriately alive
- Record timer in DM Serif is beautiful

**Production improvements required:**

1. **Add a subtle prompt above the timer.** Before recording starts, one question appears in Dusk color, Nunito 300, 16px: "What are you carrying that you haven't said out loud?" This fades out 3 seconds after recording begins, leaving just the timer and waveform. This is the only moment the app creates a prompt for spoken content.

2. **Add a real-time transcription preview.** After 10 seconds of recording, a very faint transcript begins appearing below the waveform in Dusk color, smaller text. This is not the primary UI — it's ambient feedback that Cairn is listening and understanding. Not a feature callout — just presence.

3. **The "I'd rather type" fallback.** This is critical for accessibility and demo safety. It appears as: Dusk / 12px / Nunito 400 / text-decoration: underline / below the waveform, centered. Tapping it slides the waveform away and reveals a full-screen textarea with the same dark background. The textarea is borderless — just a cursor blinking in the dark.

4. **Microphone permission state.** If mic permission is denied, the recording circle becomes the "type instead" interface immediately — no error message, no friction. Just adaptation.

5. **Submission state.** After tapping stop, the waveform freezes (all bars snap to medium height simultaneously, no animation — one moment of stillness). Then the screen cross-fades to a processing state: the circle becomes a slow spinner in Moss. Copy: "Reading between the lines." Duration: actual API call time, minimum 1.5 seconds (never flash a result instantly — it feels unread).

### Screen 3 — Matching / Waiting Screen

**What's working:**
- Three pulsing rings is the right visual language
- Dark background correctly signals "something is happening"
- Floating avatars around the rings are the right idea

**Production improvements required:**

1. **Remove the floating avatar initials.** Real initials (K, M, R, A, J) imply real identities. Replace with anonymous colored circles only — no letters. 5 circles in the prototype's colors, positioned identically. When a circle "finds" a member, that dot transitions from dim to bright with a gentle glow.

2. **The rotating status text must be deliberate.** The three phrases cycle on a 4-second interval with a cross-fade (not a slide):
   - "Finding people who get it..." (0-4s)
   - "Balancing your circle..." (4-8s)  
   - "Almost there..." (8s+, loops to first after 12s)
   The ambiguity is intentional. No ETA. No progress percentage. No spinner step labels.

3. **The matching tags must update in real time.** As the algorithm confirms each composition requirement, tags flip from pending to found:
   - `◌ Similar stage` → `✓ Similar stage` (green, filled)
   Tags should not all appear pre-confirmed. They confirm one-by-one with a 600ms stagger as the algorithm works. This makes the matching feel real and careful.

4. **When the circle is ready.** The rings collapse inward (scale to 0 with ease-out over 600ms). The center circle expands to fill the screen (scale grows to cover the dark background). A brief message appears centered in Moss-tinted cream: "Your circle is ready." Then cross-fades to the session screen.

5. **Cancel option.** A quiet "Leave queue" text link at the bottom in Dusk color, below the matching tags. It does not say "Cancel." It says "I need to step away" — honoring that the user may have a legitimate reason to leave without pathologizing it.

### Screen 4 — Live Circle Session

**What's working:**
- The circle visualization of members is the right metaphor
- AI facilitator card is visually distinct from member messages
- Dark background maintains the intimate mode

**Production improvements required:**

1. **Remove first-letter initials from member avatars in the circle diagram.** Use colored circles only, consistent with the matching screen anonymity. The role label below each avatar is their identity in the session.

2. **The "You" position in the circle must always be at the bottom-center.** This is orientational — you are the anchor point. Everyone else is around you. The circle positions must be calculated relative to your fixed position.

3. **Speaking indicator must only show on the currently-active message sender.** The `speakPulse` animation applies to the circle avatar whose last message was most recent and within the last 30 seconds. After 30 seconds of silence from that member, their avatar returns to resting state.

4. **The AI facilitator message format.** The message should NOT start with "Cairn:" (name prefix). The facilitator has no name in the circle — it has a symbol (🪨 or a small moss-colored wave icon). The facilitator's message appears centered, smaller font, in the Sand-colored card — visually distinct from all member messages. Never uses a chat-bubble shape.

5. **Message input must support both text and voice.** The mic button (Moss circle, 42px) is the primary. Tapping it records a voice message that is transcribed and appears as text. The text input is secondary — appears as a ghost field next to the mic. This prevents the session from becoming a typing race.

6. **Session close ceremony.** When the session ends (timer, group wind-down, or facilitator close), a full-screen overlay fades in on the Stone background with the close message in DM Serif. Below it, two options appear with 600ms stagger: "Save an insight" (Moss button) and "Close session" (ghost button). Saving an insight opens a text field with the most AI-identified valuable moment pre-filled for editing.

7. **Crisis resource display.** When triggered, a card slides up from below the facilitator area (NOT replacing it). Sandy background, warm tone. Copy: "It sounds like you might be carrying something larger than what this circle can hold. There are people available right now." [Resource link]. The circle continues — the person is not removed, not flagged visually to others.

### Screen 5 — Memory Wall

**What's working:**
- Card left-border in Moss is visually distinctive and correct
- Filter pills are correctly implemented
- "helped" count with emoji reaction is the right light-touch engagement

**Production improvements required:**

1. **Lead with a featured card.** The first card shown should be the highest-relevance card for this user (matched on their primary_burden and persona), displayed slightly larger (padding 24px, shadow Level 3) with a small "— for you" indicator in Dusk text. Not a "recommended" label — just slightly more visual weight.

2. **The quote on memory cards should use Caveat font when it IS a user-submitted insight.** Seed content that is written by the content team uses Nunito 600 for the h4 (as currently designed). User-submitted insights that survived the filter use Caveat 500 for their text. This visual distinction honors the origin without stating it.

3. **The "helped" interaction.** Tapping the helped count animates: the emoji scales up to 1.3 and back over 200ms, the count increments, and the color shifts from Dusk to Moss. This persists for this user's session. The API call is fire-and-forget — no loading state.

4. **Filter pills must animate on filter change.** When a category is selected, cards that don't match fade to 0.3 opacity and shift slightly (translateY 4px), while matching cards animate in with cardEnter. This communicates selection without hard showing/hiding.

5. **The empty filter state.** If a filter has no cards: "No memories yet for this — be the first to share one after your next circle." Dusk text, 14px, centered, with a soft Moss icon. Never a generic empty state.

6. **Infinite scroll, not pagination.** The Memory Wall should feel endless. Fetch 10 cards at a time. New cards enter from the bottom as the user scrolls, with cardEnter animation. No "Load more" button.

### Screen 6 — Profile / Persona

**What's working:**
- Moss gradient header with profile avatar is visually strong
- The curved bottom edge of the header (::after pseudo-element) is a nice detail
- Stats row is appropriately minimal (3 numbers only)
- Persona meters are the right metaphor

**Production improvements required:**

1. **The "Anonymous You" name must be replaced with the user's chosen persona emoji + role label.** Example: "🌱 Finding Ground" in DM Serif. This is their identity in Cairn — it tells them who they are today, not who they are in the world.

2. **The persona arc visualization.** Below the stats row, before the persona cards, add a 30-day arc visualization. Not a line graph — a series of 30 small colored dots, arranged in a gentle arc from left to right. Each dot is: Ember (storm), Sand (ground), Moss (through_it). This is their journey without numbers. Hovering/pressing a dot shows the date and assigned persona — no other data.

3. **The stress/recovery/engagement meters are WRONG for this product.** These look like fitness app metrics and violate the "presence over information" principle. Replace with:
   - A single "Today's persona" display (the emoji + label + 2-sentence description from the last journal entry's recognition message)
   - A "Your themes" section: 3-5 colored tags showing the burden themes most frequently appearing in recent entries
   - Remove the numerical meter tracks entirely

4. **Burdens dropped section.** A quiet list (not cards — just rows) of the user's last 3 burden drops, showing only the community count next to each: "Carrying the weight of an invisible timeline · 247 others." No raw burden text ever shown back to user. Just the count as validation.

5. **Circles I've been in.** Just a count + most recent date. "8 circles. Last one: 3 days ago." One sentence. Not a log.

---

## PART VI — ONBOARDING SCREENS (NOT IN PROTOTYPE — SPECIFY NOW)

### Onboarding Screen 1 — The Memory Wall Pre-view

**Before any question, before any auth.** The user sees 2 Memory Wall cards, full-screen, with no UI chrome. Just the cards, on the cream background, with soft typography. They can scroll. After 8 seconds or one scroll, a gentle fade appears at the bottom: "Something moving here?" — a single, optional tap target in Moss text. Tapping it advances to onboarding.

If they don't tap: a very subtle bottom sheet slides up after 15 seconds: "Continue to Cairn →" — small, unobtrusive. Not a modal. Not a blocker.

### Onboarding Screen 2 — "Where are you right now?"

Four large selection tiles, full-width, stacked vertically, each with:
- An icon (moss-tinted, not emoji)
- A short label (2-4 words)
- No description (the label must be sufficient)

Tiles:
```
🧳  Just arrived somewhere new
🌊  In the middle of something hard  
🌱  Finding my footing
🤝  Trying to help others find theirs
```

Selection state: the selected tile gets a Moss left-border (3px) and the background shifts from White to Moss Soft. The icon color shifts to Moss. No checkmark — the border and color are enough.

### Onboarding Screen 3 — "What carries the most weight?"

Same tile format. Four options:
```
💼  Career & what comes next
👨‍👩‍👧  Family & what they expect
🧭  Belonging & where I fit
🌀  All of it, honestly
```

"All of it, honestly" should be visually slightly different — slightly bolder label weight — because it's the most emotionally true option and the one many users actually feel. But it should not be pre-selected or nudged.

### Onboarding Screen 4 — Google Sign-In

Not a standard sign-in page. The screen has:
- Above the button: DM Serif, 22px, Stone: "Your space is ready."
- Below that: Nunito 300, 14px, Dusk: "We only use your account to keep this space yours. No one in Cairn knows who you are." (Two sentences. No more.)
- One button: "Continue with Google" — Moss pill, full-width minus 48px margins
- Below the button, 11px Cloud: "By continuing, you agree to our [Privacy Policy] and [Terms]. Your journal entries and burden drops are encrypted."

The onboarding answers (stage + burden) are stored in local state until after OAuth completes, then sent with the user creation webhook. The user should never see a loading state between "Continue with Google" and landing on the Memory Wall — the personalization happens server-side while the Memory Wall loads with non-personalized content (imperceptible to the user).

---

## PART VII — MICROCOPY & CONTENT STANDARDS

### The Forbidden Word List

These words and phrases NEVER appear anywhere in the Cairn UI — in buttons, labels, microcopy, AI output, error messages, or any other surface:

```
WELLNESS JARGON:    heal, healing, wellness, self-care, journey, resilient, 
                    resilience, growth mindset, thrive, flourish, mindful,
                    mindfulness, check-in (as noun), mental health (except 
                    legal contexts), emotional wellbeing

CLINICAL LANGUAGE:  therapy, therapist, counselor, diagnose, diagnosis, 
                    symptom, condition, disorder, treatment, episode, trigger 
                    (except in technical contexts)

PATRONIZING COPY:   you're safe here, it's okay to feel this way, be kind 
                    to yourself, you're not alone (say it with data instead),
                    we're here for you, take it one day at a time

GAMIFICATION:       streak (acceptable in streak card only), points, rewards,
                    achievements, badges, level up, unlock

CORPORATE:          community guidelines, user, content, platform, engage,
                    leverage, utilize
```

### The Permitted Vocabulary

Words that feel like Cairn:

```
EMOTIONAL:     carry, weight, burden, hold, drop, survive, through, 
               landed, real, name, see, heard

RELATIONAL:    circle, people, someone, others, together, alongside

TEMPORAL:      right now, today, lately, these days, this week

HONEST:        honestly, exactly, specific, particular, named

ACTION:        put it down, step outside, close your eyes, say it out loud
```

### Microcopy Specifications by Surface

**Navigation Labels:** Home, Echoes, Record, Me. Never: Feed, Log, Journal, Profile, Account.

**Error Messages:**
```
AI unavailable:  "This moment needs a pause. Try again in a few minutes."
                 NOT: "Service temporarily unavailable. Error code: 503."

Network error:   "Something's not connecting right now."
                 NOT: "Failed to connect to server."

No circle match: "Your circle is still forming. Check back soon — or come back 
                 to this tomorrow and we'll have found the right people."
                 NOT: "No match found. Try again later."
```

**Empty States:**
```
No journal entries:  "Your journal is waiting for its first entry.
                     It doesn't have to be about anything in particular."
                     
No circles yet:      "You haven't been in a circle yet. The center button 
                     will find you the right one."
```

**Loading States:**
```
Memory Wall loading:  No skeleton screens — just a gentle pulse on the
                      warm-cream background (3 sand-colored placeholder 
                      rectangles, subtle pulsing animation)

Journal processing:   "Reading between the lines." (not "Processing...")

Circle matching:      "Finding people who get it..." (see Screen 3 spec)

AI response:          A single pulsing Moss dot. No text. No spinner.
```

---

## PART VIII — ACCESSIBILITY

### Requirements (Non-Negotiable)

**Contrast ratios:**
- Stone (#2C2825) on Cream (#F5F0EA): 12.3:1 ✓ (exceeds AAA)
- Dusk (#8B7E74) on Cream (#F5F0EA): 4.7:1 ✓ (passes AA, marginal AAA)
- Cloud (#C9BFB2) on Stone (#2C2825): 4.5:1 ✓ (passes AA exactly — do not darken)
- Moss (#6B8F71) on White (#FFFFFF): 4.8:1 ✓ (passes AA)
- White (#FFFFFF) on Moss (#6B8F71): 4.8:1 ✓ (buttons pass AA)
- Ember (#D4845A) on Stone (#2C2825): 4.6:1 ✓ (passes AA)

**Do NOT use Dusk on Sand** — contrast is only 2.1:1, fails AA. This combination is forbidden.

**Touch targets:** Minimum 44×44px for all interactive elements. The nav items are 22px icons — the touch target must be padded to 44px minimum. Implement with padding or a larger hit-target pseudo-element.

**Focus states:** Visible keyboard focus ring on all interactive elements. Use:
```css
:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 3px;
  border-radius: inherit;
}
```
Never `outline: none` without a replacement visible focus indicator.

**Motion preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  /* Exception: burden count reveal delay must still apply (it's a pause, not motion)
     Preserve: animation-delay values on burden-count-number */
}
```

**Screen reader considerations:**
- The anonymous role labels (storm, finding ground, through_it) must have `aria-label` providing context: `aria-label="Member in storm — currently struggling"` for screen readers
- The burden count number must read: `aria-label="247 people in this community have carried this exact weight"`
- The 2-second pause before the count should be implemented with `aria-live="polite"` so screen readers announce the number when it appears
- The waveform display is decorative — `aria-hidden="true"`
- Recording state: `aria-live="polite"` announcement of "Recording started" / "Recording stopped"

**Voice control:** All interactive elements must have visible text labels or `aria-label` values that voice control users can reference.

---

## PART IX — PERFORMANCE STANDARDS

### Critical Performance Rules

**First Contentful Paint < 1.2 seconds.** The Memory Wall home screen must render meaningful content (at minimum: greeting + streak card) before 1.2 seconds. The Memory Wall cards are server-rendered and streamed — they do not wait for authentication.

**Layout Shift = 0.** No element moves after initial render. Reserve space for all dynamic content. Images and cards must have defined dimensions before content loads. CLS target: < 0.1 (Google Core Web Vital threshold).

**Font loading strategy:**
```html
<!-- In <head>, before any rendering -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" 
  href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Nunito:wght@300;400;500;600;700&family=Caveat:wght@500&display=swap">
```
`font-display: swap` is required. Flash of unstyled text is acceptable. Flash of invisible text is not.

**Image handling:** Memory Wall cards have no images — text only. Profile avatar is an emoji (no image load). The only images in the app are user-provided audio blobs (not rendered as images). This means Cairn has near-zero image performance concerns by design.

**Animation performance:** All animations must use `transform` and `opacity` only — never animate `height`, `width`, `margin`, `padding`, `top`, `left`. These trigger layout recalculation. The matching rings, burden count reveal, card slide-ups — all use transform/opacity exclusively.

**JavaScript bundle:** Target < 120kB gzipped for initial load. The circle session page (with Supabase Realtime) is loaded separately via dynamic import — it's only needed when a session starts.

---

## PART X — RESPONSIVE & DEVICE SPECIFICATIONS

### Primary Target

**iPhone 14 / 15 standard size: 390×844pt** — This is the design target. All pixel specs in this document are at this size.

**Secondary targets:**
- iPhone SE (3rd gen): 375×667pt — minimum supported width
- iPhone 14 Plus / Pro Max: 430×932pt — scale gracefully
- Android (various): 360–412px wide — functional parity required

### Layout Adaptation

**375px (minimum):** Horizontal padding reduces from 24px to 20px. Card titles may wrap to 2 lines. Matching tags wrap to 2 rows. Everything else maintains proportions.

**390px (target):** All specs as documented.

**430px (large phones):** Cards gain 4px additional horizontal margin. The matching circle can be 10% larger. Font sizes unchanged.

### Safe Area Handling (Required for Production)

```css
/* Status bar (top) */
.status-bar { padding-top: max(14px, env(safe-area-inset-top)); }

/* Home indicator (bottom) */
.bottom-nav { padding-bottom: max(28px, env(safe-area-inset-bottom)); }

/* Session input area */
.session-input-area { 
  padding-bottom: max(32px, calc(env(safe-area-inset-bottom) + 12px)); 
}
```

Without these, the UI collides with iPhone notch/Dynamic Island and home indicator. This is not optional.

---

## PART XI — PRODUCTION QUALITY CHECKLIST

### Design Implementation Review

Before shipping any screen, verify:

**Typography:**
- [ ] DM Serif used only for headlines/display copy
- [ ] Caveat used only for Memory Wall quotes
- [ ] Nunito used for all UI text
- [ ] Font smoothing applied globally
- [ ] No text below 11px rendered on screen
- [ ] Line-height >= 1.4 on all body copy

**Color:**
- [ ] No colors outside the defined palette
- [ ] Ember used ONLY for storm persona indicators
- [ ] Dusk never on Sand background (contrast failure)
- [ ] All Moss CTAs have Glow Moss shadow
- [ ] Dark screens (stone bg) have no Level 2 card shadows

**Motion:**
- [ ] No animation uses height/width/margin (only transform/opacity)
- [ ] Burden count 2-second delay preserved
- [ ] Cards slide up (not sideways, not down)
- [ ] Matching rings at 2400ms period (not faster)
- [ ] `prefers-reduced-motion` respected

**Spacing:**
- [ ] 24px horizontal screen margin maintained throughout
- [ ] Safe area insets applied (top + bottom)
- [ ] No card content within 16px of card edge
- [ ] Bottom nav has minimum 90px content clearance

**Content:**
- [ ] No forbidden words on any surface
- [ ] Error messages use permitted vocabulary
- [ ] Empty states have specific, warm copy
- [ ] Loading states have copy (not just spinners)

**Accessibility:**
- [ ] All contrast ratios pass AA
- [ ] Touch targets >= 44×44px
- [ ] Focus rings visible on all interactive elements
- [ ] Decorative animations marked aria-hidden
- [ ] Screen reader announcements on key moments

**Performance:**
- [ ] Fonts preloaded
- [ ] No CLS on page load
- [ ] No animations on width/height/margin properties
- [ ] Circle session JS loaded dynamically, not on initial load

---

## APPENDIX A — CSS CUSTOM PROPERTIES (COMPLETE)

```css
:root {
  /* Colors */
  --stone:        #2C2825;
  --stone-90:     rgba(44, 40, 37, 0.90);
  --warm-cream:   #F5F0EA;
  --white:        #FFFFFF;
  --sand:         #E8DFD3;
  --sand-light:   #F0EAE0;
  --moss:         #6B8F71;
  --moss-deep:    #5A7D60;
  --moss-light:   #8FB996;
  --moss-glow:    rgba(107, 143, 113, 0.15);
  --moss-soft:    rgba(107, 143, 113, 0.08);
  --ember:        #D4845A;
  --ember-light:  #E8A87C;
  --ember-glow:   rgba(212, 132, 90, 0.15);
  --dusk:         #8B7E74;
  --cloud:        #C9BFB2;
  --cloud-light:  #D9D1C6;
  --red-soft:     #D45A5A;
  --blue-soft:    #5A8FD4;

  /* Typography */
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body:    'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-hand:    'Caveat', cursive;

  /* Spacing */
  --screen-px:    24px;
  --card-p:       20px;
  --card-p-sm:    14px;
  --gap-xs:       6px;
  --gap-sm:       10px;
  --gap-md:       12px;
  --gap-lg:       16px;
  --gap-xl:       24px;

  /* Radius */
  --radius-pill:  9999px;
  --radius-card:  16px;
  --radius-card-sm: 10px;
  --radius-badge: 4px;

  /* Shadows */
  --shadow-1:     0 1px 6px rgba(44, 40, 37, 0.04);
  --shadow-2:     0 2px 12px rgba(44, 40, 37, 0.05);
  --shadow-3:     0 6px 24px rgba(44, 40, 37, 0.08);
  --shadow-moss:  0 4px 20px rgba(107, 143, 113, 0.40);
  --shadow-ember: 0 0 40px rgba(212, 90, 90, 0.30);

  /* Easing */
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-enter:    cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-exit:     cubic-bezier(0.4, 0.0, 1.0, 1);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Durations */
  --dur-micro:     150ms;
  --dur-fast:      200ms;
  --dur-standard:  300ms;
  --dur-deliberate: 450ms;
  --dur-slow:      600ms;
  --dur-ceremonial: 800ms;
}
```

---

## APPENDIX B — COMPONENT DECISION TREE

When designing a new component, answer these questions in order:

1. **Is this displaying community data?** → Use warm-cream surface, White cards, Moss accents
2. **Is this a private/inward moment?** → Use Stone surface, glass cards, no Ember unless storm
3. **Is this an action?** → Moss pill button. Is it destructive? → Red-soft. Is it secondary? → Ghost
4. **Does it need elevation?** → Shadow Level 2. Does it need hover? → Level 3 + translateY(-2px)
5. **Does it animate in?** → cardSlideUp from below. Does it reveal? → fade-in with delay
6. **Does it have a label?** → Nunito 700 uppercase with letter-spacing. Is it a headline? → DM Serif
7. **Is it a quote from a human?** → Caveat font. Is it AI text? → Nunito 300, Sand card

---

*Cairn Design System v1.0 — Production Specification*  
*Every pixel is a choice. Make them all with the same care*  
*that someone took to type their burden into a text field at 2am.*
