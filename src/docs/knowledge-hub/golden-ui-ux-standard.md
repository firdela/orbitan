# Orbitan Golden UI/UX & Accessibility Standard (Non-Negotiable)

> No feature or screen is considered complete unless it satisfies these standards.

## Design Philosophy

Orbitan should feel: **Modern · Professional · Premium · Enterprise-grade ·
Friendly · Clean · Efficient · Intelligent · Scalable · Consistent.**

Every interaction should reduce complexity, not introduce it. Clarity over
decoration. Usability over unnecessary visual effects.

## One Unified Design Language

Consistency across: Colors · Typography · Icons · Buttons · Cards · Tables · Forms ·
Modals · Navigation · Layouts · Animations · Spacing · Shadows · Borders · Empty/Error/
Success/Loading states.

Users should immediately recognise that every screen belongs to the Orbitan ecosystem.

### Tokens (Implemented)

- **Surfaces:** "Titanium White" OS (`--background: 220 20% 97%`) + "Deep Titanium" dark sidebar (`--sidebar-background: 222 47% 9%`)
- **Typography:** Sora (heading/display) · Inter (body) — loaded via `@import` in `src/index.css`
- **Primary:** Orbit Blue `#2563EB` (`--primary: 221 83% 53%`)
- **Industry Pack Colours:** F&B orange, Retail green, Recycling green, Healthcare cyan, Education violet, Logistics blue, Construction yellow, Technology black
- **Plan Colours:** Starter blue, Growth emerald, Business violet, Enterprise titanium + gold

## Accessibility by Default (WCAG)

Mandatory — never optional.

- High color contrast
- Readable typography
- Keyboard navigation (full)
- Screen reader compatibility (semantic HTML, ARIA labels)
- Accessible form validation (inline errors, preserved input)
- Logical focus order + visible keyboard focus
- Large touch targets (min 44×44px)
- Clear error messaging in plain language
- Alternative text for all images
- Responsive text scaling
- Motion reduction support (`prefers-reduced-motion`)
- Color-blind friendly design
- Reduced cognitive complexity

**Design for everyone:** wheelchair users, PMD users, elderly, low vision, blind,
hearing-impaired, neurodivergent, temporary injuries, first-time technology users.

## Responsive Everywhere

Works seamlessly on: Mobile · Tablet · Laptop · Desktop · Large displays · Foldables.
Layouts adapt intelligently without compromising usability or aesthetics.

## Performance First

Optimise: Loading speed · Navigation · Rendering · Data fetching · Animations ·
Images · API requests · Memory usage. Provide meaningful loading indicators where
delays are unavoidable.

## Navigation Principles

Predictable · Consistent · Discoverable · Logical · Role-aware.
Users should never wonder: "Where am I?" / "What should I do next?" / "How do I go back?"
Minimise navigation depth.

## Forms & Data Entry

Minimise typing. Use intelligent defaults. Validate in real time. Prevent mistakes
before submission. Auto-save drafts where appropriate. Support keyboard shortcuts.
Explain errors clearly. Preserve entered data on validation failure.

## Tables & Data

Support: Search · Filtering · Sorting · Bulk actions · Export · Import · Pagination/
virtualisation · Saved views · Custom columns · Responsive layouts.

## AI Experience

AI enhances human decision-making — never replaces it.

- Explain recommendations where appropriate
- Allow users to review and edit AI-generated content
- No unexpected automated actions
- Clearly indicate when content is AI-assisted
- Keep users in control of important actions

## Error Prevention & Recovery

Prevent problems before they happen. When errors occur: explain what happened in
plain language, explain why, suggest how to fix it, offer a clear recovery path,
preserve user progress.

## Security & Trust

Users should always understand: what information is being shared, why permissions
are requested, what actions are irreversible, when sensitive operations require
confirmation. Security builds confidence, not confusion.

## Quality Checklist (Mandatory Before Release)

- [ ] Visual consistency with Orbitan design system
- [ ] Responsive across supported devices
- [ ] Accessibility reviewed and compliant (WCAG)
- [ ] Keyboard and screen reader compatibility verified
- [ ] Performance optimised
- [ ] Navigation is intuitive
- [ ] Error handling is clear and user-friendly
- [ ] Forms validated and easy to complete
- [ ] Empty, loading, success, and error states designed
- [ ] AI interactions are transparent and user-controlled
- [ ] Security and privacy considerations addressed
- [ ] Role-based permissions respected
- [ ] Tested across supported browsers and OS
- [ ] Documentation updated
- [ ] Meets Orbitan's standard of a premium enterprise experience

## Final Principle

> Every person interacting with Orbitan — whether a founder, executive, manager,
> employee, partner, customer, or user with accessibility needs — should feel that
> the platform is **intuitive, reliable, inclusive, trustworthy, and thoughtfully designed.**

When making any design decision, ask:
**"Does this make Orbitan simpler, more inclusive, more accessible, more consistent,
more scalable, and more enjoyable to use?"**

If the answer is not an unequivocal **Yes**, refine until it achieves Orbitan's
Golden Standard.

---

**Last Updated:** 2026-07-07