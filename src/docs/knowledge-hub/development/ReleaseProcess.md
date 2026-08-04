---
title: Orbitan Release Process
category: Development
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - TestingStandards.md
  - BuildChecklist.md
  - MobileStrategy.md
tags:
  - release
  - deployment
  - monitoring
  - rollback
  - feedback
---

# Orbitan Release Process

## Purpose

Defines the development-to-release workflow, testing gates, monitoring, rollback process, and feedback loop.

## Release Pipeline

```
Development → Testing → Pilot Validation → Release → Monitoring → Feedback
```

### 1. Development
- Implement feature following [DevelopmentRules.md](./DevelopmentRules.md)
- Follow [GoldenUIUX.md](../design/GoldenUIUX.md) standards
- Apply RLS on all new entities
- Write backend functions following [APIStandards.md](../architecture/APIStandards.md)
- Test backend functions with `test_backend_function`

### 2. Testing
- Manual testing across devices and browsers
- Core workflow regression testing
- Security testing (RLS, role-based access)
- Pilot tenant acceptance testing

### 3. Pilot Validation
- Deploy to pilot tenants for real-world validation
- Collect feedback via IssueLog and WorkerFeedback
- `nexusFeedbackAnalyst` processes feedback
- Product Owner signs off on acceptance

### 4. Release
- Auto-deploy from Base44 (changes render immediately in preview)
- Publish to production
- Update documentation in Knowledge Hub
- Create Decision Record if architectural change

### 5. Monitoring
- `OrbitUsageTracker` tracks AI request performance
- `AuditLog` captures all operations
- `DeploymentLog` tracks deployment history
- Error monitoring via uncaught errors surfacing to users

### 6. Rollback
- Git-based version control enables reverting to previous state
- Entity schema changes are backward-compatible (new fields have defaults)
- `SystemSettings.maintenance_mode` can take the platform offline if needed
- `SystemSettings.nexus_ai_enabled` kill switch for AI emergencies

### 7. Feedback
- `IssueLog` captures bug reports, improvements, feature requests
- `WorkerFeedback` captures worker voice
- `EvolutionProposal` captures AI-generated improvement recommendations
- Feedback drives the next development cycle

## Version Management

- Platform version tracked in `SystemSettings.platform_version`
- Manifest versions tracked in `ActivationRegistry.manifest_version`
- Entity schemas are backward-compatible
- Decision Records track architectural changes with rationale

## Deployment Notes

- Base44 auto-deploys backend functions on save
- Frontend changes render immediately in preview
- Publish to production makes changes live
- PWA service worker prompts users to update

## Related Documents

- [TestingStandards.md](./TestingStandards.md) — Testing strategy
- [BuildChecklist.md](./BuildChecklist.md) — Pre-release checklist
- [MobileStrategy.md](./MobileStrategy.md) — PWA strategy