# Zenith — Accessibility

Summary of accessibility (a11y) support and known limitations.

---

## Implemented

- **Skip to main content:** A “Skip to main content” link is the first focusable element in the app shell. It is visually hidden until focused (keyboard or programmatic focus) and moves focus to the main content area (`#main-content`).
- **Focus order:** Interactive elements are focusable in a logical order. Buttons and links use native focus styles; consider using `:focus-visible` for a consistent visible focus ring (see theme).
- **Keyboard navigation:** All primary actions (buttons, links, form controls) are keyboard accessible. Modals can be closed with **Escape**.
- **ARIA:**
  - Header has `role="banner"`; main nav and bottom nav have `aria-label`.
  - Icon-only buttons (theme toggle, logout, modal close, toast dismiss) have `aria-label` or equivalent.
  - Decorative icons use `aria-hidden="true"`.
  - Modals use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` (and `aria-describedby` where useful).
- **Form labels:** Login and Signup inputs are associated with visible labels via `id`/`htmlFor`. Activities search and sort have `aria-label` or an associated label. Add Activity modal uses visible labels and ARIA where needed (e.g. sport toggle group).
- **Modals:** Add Activity, Delete confirmation, Create Challenge, and Edit Profile modals have a visible close control and close on Escape. Add Activity modal moves focus into the dialog when opened and restores focus on close.
- **Color contrast:** Theme colors (dark and light) in `src/index.css` use CSS variables that aim for sufficient contrast for body text and primary UI. Accent buttons use light text on dark gradient.

---

## Known limitations

- **Focus trap:** Only the Add Activity modal implements a full focus trap (focus kept inside the dialog until closed). Other modals (delete confirm, Create Challenge, Edit Profile) do not trap focus; keyboard users can tab out of the dialog. Improving this would require trapping focus and cycling tab order within each modal.
- **Live regions:** Toasts are marked `role="status"` and `aria-live="polite"`. Screen reader behavior may vary; critical errors might benefit from `aria-live="assertive"` or `role="alert"` where appropriate.
- **Reduced motion:** There is no `prefers-reduced-motion` handling. Animations (e.g. modal open, toasts, shimmer on XP bar) are always enabled.
- **Theme transition:** Theme switch (dark/light) uses a short transition (~200–350 ms). No user preference for “no transition” is respected yet.
- **Leaderboard / Challenges loading:** Async data (e.g. leaderboard users, challenges) may show empty content before load. Loading states (spinner/skeleton) are applied for consistency but are not announced to screen readers (e.g. `aria-busy` or live region updates).
- **Custom controls:** The notifications toggle on Profile Settings is a custom control; it is keyboard focusable and toggles with Enter/Space, but could be improved with `role="switch"` and `aria-checked` for clearer semantics.

---

## Testing suggestions

- Use **keyboard only** (Tab, Shift+Tab, Enter, Space, Escape) to navigate and trigger actions.
- Use a **screen reader** (e.g. NVDA, VoiceOver, TalkBack) to verify labels and flow.
- Check **color contrast** with dev tools or tools like WebAIM Contrast Checker for text and interactive elements in both themes.
- Test **zoom** and large text; layout uses relative units and should reflow.

---

## References

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
