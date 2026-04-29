
## Scroll-Triggered Animations for Pack Cards

I will implement smooth, viewport-aware animations for pack cards using the **Intersection Observer API** combined with **Framer Motion** for polished, performant scroll animations.

### Implementation Approach

#### 1. Create a Reusable ScrollReveal Component
**File:** `src/components/ScrollReveal.tsx`

A wrapper component that uses Intersection Observer to detect when elements enter the viewport:
- Configurable threshold (how much of element must be visible)
- Configurable animation variants (slide-up, scale, fade, etc.)
- Once-only animation option (don't re-animate on scroll back)
- Stagger delay support for lists
- Uses Framer Motion's `useInView` hook for smooth animations

#### 2. Add New Animation Variants
**File:** `tailwind.config.ts` (keyframes) + Framer Motion variants

New scroll-specific animations:
- **slide-up-reveal**: Cards slide up from below with fade
- **scale-reveal**: Cards scale up from 95% with subtle bounce
- **stagger-cascade**: Each card animates with increasing delay
- **valentine-entrance**: Heart-themed entrance with gentle rotation

#### 3. Update PackCard Component
**File:** `src/components/PackCard.tsx`

Wrap the card content with animation motion props:
- Add `motion.div` wrapper with viewport-triggered animation
- Include a subtle scale and shadow transition on reveal
- Add a decorative heart sparkle effect that plays on first reveal

#### 4. Update Dashboard Pack List
**File:** `src/pages/Dashboard.tsx`

Replace static animation delays with scroll-triggered approach:
- Remove inline `animationDelay` styles
- Wrap each PackCard in ScrollReveal with stagger index
- Add viewport margin for early trigger (elements start animating slightly before fully visible)

#### 5. Add CSS Enhancements
**File:** `src/index.css`

Additional scroll-reveal specific styles:
- `reveal-shadow`: Dynamic shadow that appears with card
- `reveal-glow`: Subtle valentine glow effect on reveal
- Smooth transition utilities for scroll animations

### Animation Behavior

```
User scrolls down
    |
Card enters viewport (20% visible)
    |
Animation triggers:
  - Card slides up 30px -> 0px
  - Opacity: 0 -> 1
  - Scale: 0.95 -> 1.0
  - Subtle shadow appears
  - Duration: 0.5s with ease-out
    |
Next card animates (0.1s stagger delay)
    |
Animation completes, card stays visible
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ScrollReveal.tsx` | CREATE | Reusable scroll animation wrapper |
| `src/components/PackCard.tsx` | MODIFY | Add motion wrapper + animation props |
| `src/pages/Dashboard.tsx` | MODIFY | Integrate ScrollReveal for pack list |
| `tailwind.config.ts` | MODIFY | Add new keyframes for scroll animations |
| `src/index.css` | MODIFY | Add reveal-specific CSS utilities |

### Technical Details

- Uses **Framer Motion's `useInView`** hook for performant viewport detection
- **`once: true`** option ensures cards only animate on first scroll (not when scrolling back up)
- **Viewport margin: `-50px`** triggers animation slightly before card is fully visible for smoother UX
- **Stagger offset: 0.08s** per card creates a pleasing cascade effect
- Hardware-accelerated transforms (translate, scale) for 60fps performance
