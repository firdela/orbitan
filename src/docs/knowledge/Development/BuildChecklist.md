---
title: Orbitan Build Checklist
category: Development
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - TestingStandards.md
  - ReleaseProcess.md
  - ../Design/GoldenUIUX.md
  - ../Architecture/SecurityCompliance.md
tags:
  - checklist
  - pre-release
  - security
  - testing
  - performance
  - accessibility
  - AI
  - documentation
  - quality
---

# Orbitan Build Checklist

## Purpose

Pre-release checklist covering security, testing, performance, accessibility, AI, documentation, and quality. Must be satisfied before any feature is considered complete.

## Before Release

### Security
- [ ] RLS rules on all new entities (tenant_id + outlet_id scoping)
- [ ] Role-based access verified (admin, tenant_admin, outlet_manager, worker)
- [ ] No hardcoded API keys or secrets in code
- [ ] Backend functions authenticate via `base44.auth.me()`
- [ ] Admin-only functions verify `user.role === 'admin'` and return 403
- [ ] Shield governance interceptor applied to sensitive writes
- [ ] Tenant isolation verified (Tenant A cannot see Tenant B's data)

### Testing
- [ ] Manual testing across devices (mobile, tablet, desktop)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Core workflow regression testing
- [ ] Backend function tested with `test_backend_function`
- [ ] Role-based access tested for all roles
- [ ] Empty/loading/error states tested
- [ ] Form validation tested (inline errors, preserved input)

### Performance
- [ ] Page load < 2 seconds on 4G mobile
- [ ] API response < 500ms for standard operations
- [ ] Loading indicators shown during data fetching
- [ ] Lazy loading for heavy components
- [ ] No unnecessary re-renders (React.memo where needed)
- [ ] Images lazy loaded
- [ ] Pagination on large lists

### Accessibility
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] All images have alt text
- [ ] Colour contrast meets 4.5:1 minimum
- [ ] Touch targets minimum 44×44px
- [ ] `prefers-reduced-motion` respected
- [ ] Focus order is logical and visible
- [ ] Form labels associated with inputs

### AI
- [ ] AI features are additive, not blocking (ADR-0017)
- [ ] `useNexusAI` hook used for all AI calls
- [ ] Graceful degradation when AI is unavailable
- [ ] AI kill switch respected (`SystemSettings.nexus_ai_enabled`)
- [ ] AI confidence scores visible on proposals
- [ ] AI-generated content is reviewable and editable
- [ ] AI actions logged to AuditLog

### Documentation
- [ ] Knowledge Hub updated if architectural change
- [ ] Decision Record created if significant decision
- [ ] API contracts updated if new backend function
- [ ] Entity schema documented if new entity
- [ ] `last_updated` field updated on edited documents

### Quality
- [ ] Visual consistency with Orbitan design system
- [ ] Responsive across supported devices
- [ ] Navigation is intuitive
- [ ] Error handling is clear and user-friendly
- [ ] Empty, loading, success, and error states designed
- [ ] Role-based permissions respected
- [ ] Tested across supported browsers and OS
- [ ] Meets Orbitan's standard of a premium enterprise experience

## Golden UI/UX Checklist

From [GoldenUIUX.md](../Design/GoldenUIUX.md):

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

## Related Documents

- [TestingStandards.md](./TestingStandards.md) — Testing strategy
- [ReleaseProcess.md](./ReleaseProcess.md) — Release workflow
- [../Design/GoldenUIUX.md](../Design/GoldenUIUX.md) — Golden UI/UX Standard
- [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md) — Security standards