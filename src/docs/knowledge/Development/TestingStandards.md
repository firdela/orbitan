---
title: Orbitan Testing Standards
category: Development
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - DevelopmentRules.md
  - ReleaseProcess.md
  - BuildChecklist.md
tags:
  - testing
  - manual-testing
  - regression
  - acceptance
  - pilot-testing
---

# Orbitan Testing Standards

## Purpose

Defines the testing strategy, testing types, and quality assurance process for OrbitanOS.

## Testing Strategy

OrbitanOS uses a pragmatic testing approach during the MVP phase: manual testing, pilot validation, and regression testing. Automated test suites are deferred to post-MVP. The focus is on real-world validation with pilot tenants.

## Testing Types

### Manual Testing
- Feature testing after each implementation
- Cross-browser testing (Chrome, Safari, Firefox)
- Cross-device testing (mobile, tablet, desktop)
- Role-based access testing (admin, tenant_admin, outlet_manager, worker)
- Multi-tenant isolation testing (Tenant A cannot see Tenant B's data)

### Regression Testing
- After bug fixes, verify the fix doesn't break existing functionality
- Core workflow testing: Onboarding → Inventory → Procurement → Sales → Reconciliation
- Auth flow testing: Login → OTP → Register → Reset Password
- RLS verification: verify tenant isolation after schema changes

### Acceptance Testing
- Pilot tenant validates that the feature solves their real-world problem
- Product Owner signs off on feature acceptance
- Feedback captured via IssueLog entity

### Pilot Testing
- Real-world operational data from pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes)
- Feedback collected via ReportIssueModal and WorkerFeedback
- `nexusFeedbackAnalyst` processes feedback for sentiment, priority, and duplicates
- `FeedbackIntelligenceDashboard` provides admin view

## Core Workflow Test Paths

### 1. Onboarding Flow
Public Landing → Auth Gateway → Create Organisation → Select Industry → Select Plan → Configure Structure → Activate Packs → Workspace

### 2. Procurement Flow
Create PO → Upload Supplier Doc → AI Extract → Manager Verify → Receive Goods → Sync to Xero

### 3. Sales Flow
Create Invoice / Upload Receipt → AI Extract → Daily Reconciliation → Xero Sync

### 4. Governance Flow
Action → Shield Interceptor → Threshold Check → Auto-approve or Override Request → Manager Review → Audit Log

### 5. Worker Onboarding Flow
Invite Code → AccessRequest → Manager Approve → Employee Record → Workspace

## Backend Function Testing

After writing/editing a backend function:
1. Use `test_backend_function('functionName', payload={param: "value"})`
2. Check the response and logs
3. Logs catch logical errors even on success
4. Fix and re-test until response is correct

## Security Testing

- RLS audit (see [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md))
- Tenant isolation verification
- Role-based access verification
- Shield governance verification
- API authentication verification

## Future: Automated Testing (Post-MVP)

- Unit tests for backend functions
- Integration tests for entity operations
- E2E tests for core workflows
- Automated regression suite
- CI/CD pipeline with test gates

## Related Documents

- [DevelopmentRules.md](./DevelopmentRules.md) — Development rules
- [ReleaseProcess.md](./ReleaseProcess.md) — Release workflow
- [BuildChecklist.md](./BuildChecklist.md) — Pre-release checklist