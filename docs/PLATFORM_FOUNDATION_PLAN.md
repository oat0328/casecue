# CaseCue Platform Foundation

Status: Architecture target before adding Speech, Psych, Nurse, Para, or Sub as major modules.

## Product architecture

CaseCue is one education platform with shared core services and profession-specific modules.

### Core platform
- Authentication
- Organizations / tenants
- Users and memberships
- Students
- Documents
- Tasks
- Calendar / meetings / communication
- Notifications
- Reporting
- Billing / entitlements
- AI gateway
- Audit trail

### Modules
- SPED
- Speech
- Psych
- Nurse
- Para
- Sub

A module may supply its own navigation, dashboard widgets, forms, workflows, document types, reports, AI instructions, and permissions. Modules must reuse the core student, organization, document, billing, reporting, notification, audit, and AI infrastructure instead of cloning them.

## Non-negotiable data rule

One Student record per student within a tenant. Profession-specific records reference `student_id`; do not create SpeechStudent, PsychStudent, NurseStudent, etc.

The existing Student entity currently contains SPED-specific fields (eligibility, IEP dates, present levels, accommodations, services and service minutes). Those fields remain supported for backward compatibility during migration, but future platform work should move profession-specific data into module-owned records rather than expanding Student with more profession-specific columns.

## Authorization target

Do not use a broad role as the final authorization decision for module workflows. The target is:

Role -> Permissions -> Module Entitlement -> Student Scope

Examples:
- `student.view`
- `document.read`
- `meeting.view`
- `sped.iep.manage`
- `speech.session.create`
- `speech.goal.manage`
- `psych.evaluation.create`
- `nurse.health_record.read`
- `para.session.record`
- `sub.plan.read`

Backend authorization and entity RLS remain authoritative. Hiding a navigation item is not authorization.

## AI target

Use one CaseCue AI gateway with composable context:

1. Core safety / truthfulness instructions
2. Profession or role context
3. Module prompt
4. Authorized student context
5. Organization / jurisdiction context
6. Task prompt

SPED, Speech, Psych, Nurse, Para and Sub are agents/configurations over the same gateway, not six unrelated AI systems.

## Document Vault target

The shared Document infrastructure should support metadata for module, document type, owner/profession, visibility, source, effective date, and sensitivity classification. Modules reference the same vault rather than creating independent file-storage systems.

## Billing target

Billing should grant entitlements, not hardcode one product. An organization can subscribe to one or many modules. Entitlements should support module, plan, seat limits, trial dates, status and optional feature flags.

## Multi-tenant target

Every sensitive module record must be tenant-owned and protected by RLS. Cross-tenant access must be denied even if a client sends another tenant's record ID. Service-role functions must explicitly validate tenant, membership, permission and student scope before returning or mutating sensitive records.

## Migration sequence

1. Inventory and classify schemas as core, SPED module, platform/admin, migration/test, or candidate for retirement.
2. Introduce module registry and organization module entitlements without changing existing SPED behavior.
3. Introduce permission definitions, role-permission mappings and student access scopes.
4. Centralize authorization helpers for backend functions and UI capability checks.
5. Neutralize the AI core and move SPED instructions into a SPED module prompt.
6. Convert billing from a single-plan assumption to module entitlements.
7. Formalize Document Vault metadata and access rules.
8. Move shared calendar, communication, tasks, notifications and reporting behind core services.
9. Migrate SPED-specific Student fields to module-owned data incrementally, preserving compatibility reads during migration.
10. Consolidate/retire experimental import, audit and no-op schemas only after usage and data-retention checks.
11. Add automated tenant-isolation and permission tests.
12. Build the first new profession module only after the foundation tests pass.

## Definition of ready for a new module

A new module should be addable by registering its module definition, permissions, routes/navigation, dashboard widgets, module entities/forms, AI prompt pack and reports. It should not require cloning authentication, Student, Document, Task, Calendar, Billing, Reporting, Notification or AI infrastructure.
