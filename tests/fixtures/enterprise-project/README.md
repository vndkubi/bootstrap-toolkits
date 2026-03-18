# Fixture: Enterprise Project — Java/Jakarta EE ERP System

## Classification

**Enterprise** — 12 modules, 5+ domains, 200+ source files

## Tech Stack

- Language: Java 11
- Framework: Jakarta EE 9 (WildFly 27)
- Build: Maven (12-module multi-project)
- Database: Oracle 19c + Liquibase migrations
- Test: JUnit 5 + Arquillian + WireMock
- API: JAX-RS (RESTEasy)
- Messaging: ActiveMQ (JMS)
- CI/CD: Jenkins

## Project Description

A Jakarta EE ERP system for a manufacturing company. Covers procurement, inventory, production planning, HR, and finance. 12 Maven modules with clear domain boundaries and cross-domain event communication via JMS.

## Module Structure

```
enterprise-project/
├── pom.xml                              # Parent POM
├── erp-common/                          # Shared DTOs, exceptions, utilities
├── erp-procurement/                     # Domain: Procurement
│   └── src/main/java/com/erp/procurement/
│       ├── po/PurchaseOrder.java         # @Entity — status: DRAFT→APPROVED→RECEIVED
│       ├── po/PurchaseOrderService.java  # @Stateless
│       ├── supplier/Supplier.java
│       └── api/ProcurementResource.java # @Path("/procurement")
├── erp-inventory/                       # Domain: Inventory
│   └── src/main/java/com/erp/inventory/
│       ├── item/InventoryItem.java
│       ├── movement/StockMovement.java
│       └── api/InventoryResource.java
├── erp-production/                      # Domain: Production
│   └── src/main/java/com/erp/production/
│       ├── workorder/WorkOrder.java     # status: PLANNED→IN_PROGRESS→COMPLETED
│       └── bom/BillOfMaterials.java
├── erp-hr/                              # Domain: Human Resources
│   └── src/main/java/com/erp/hr/
│       ├── employee/Employee.java
│       ├── department/Department.java
│       └── payroll/PayrollEntry.java
├── erp-finance/                         # Domain: Finance
│   └── src/main/java/com/erp/finance/
│       ├── account/GeneralLedger.java
│       ├── invoice/Invoice.java
│       └── report/FinancialReportService.java
├── erp-notifications/                   # Cross-cutting: JMS event processing
├── erp-audit/                           # Cross-cutting: Audit trail
├── erp-security/                        # Cross-cutting: RBAC
├── erp-integration/                     # External integrations (ERP-to-ERP)
├── erp-batch/                           # Scheduled jobs (month-end, payroll)
├── erp-api-gateway/                     # API gateway / BFF
├── .github/
│   └── workflows/ (Jenkins — not GitHub Actions)
└── README.md
```

## Domains & Key Business Rules

### Procurement
- PO status: `DRAFT → SUBMITTED → APPROVED → RECEIVED | CANCELLED`
- Approval required for PO > $10,000 (dual sign-off > $50,000)
- Vendor evaluation score must be ≥ 3.0 to receive new orders

### Inventory
- Stock cannot go negative (enforced at DB + service layer)
- FIFO costing method
- Reorder triggered when stock < reorder_point

### Production
- WorkOrder must reference a valid BOM version
- Cannot start WorkOrder if required inventory items unavailable
- Status: `PLANNED → RELEASED → IN_PROGRESS → COMPLETED | CANCELLED`

### HR
- Employee must belong to exactly one department
- Payroll entries generated automatically on last day of month (batch job)
- Termination date cannot be before hire date

### Finance
- Every stock movement generates a GL entry (double-entry bookkeeping)
- Financial period must be open to post transactions
- Month-end close locks the period (batch job in erp-batch)

## Expected Bootstrap Output

### Classification
Enterprise → full suite + domain-scoped instructions

### Expected Agents (13+)
- `dev-orchestrator`
- `implementor` — Jakarta EE 9, Java 11, CDI, JAX-RS
- `investigator`
- `test-specialist` — JUnit 5 + Arquillian
- `code-reviewer`, `functional-reviewer`, `technical-reviewer`
- `business-analyst`
- `dependency-analyzer` — 12-module awareness
- `database-specialist` — Oracle 19c + Liquibase
- `mock-data-specialist` — WireMock
- `sequence-diagrammer`
- `sprint-planner`

### Expected Domain Instructions (5 files)
- `procurement-domain.instructions.md` — applyTo: `**/erp-procurement/**/*.java`
- `inventory-domain.instructions.md` — applyTo: `**/erp-inventory/**/*.java`
- `production-domain.instructions.md` — applyTo: `**/erp-production/**/*.java`
- `hr-domain.instructions.md` — applyTo: `**/erp-hr/**/*.java`
- `finance-domain.instructions.md` — applyTo: `**/erp-finance/**/*.java`

### Expected Language Instructions (5 files)
- `java.instructions.md` — Java 11 (NO Java 17+ sections — Java 11 detected)
- `jakartaee.instructions.md` — CDI, JAX-RS, JPA patterns
- `oracle-sql.instructions.md`
- `database-migration.instructions.md` — Liquibase
- `testing.instructions.md` — Arquillian + JUnit5

### Expected Context Risk
**High** — 12 modules → hard stop prompt before generation phases

### Expected Context Budget
- copilot-instructions.md: ~4 KB (at limit)
- Domain instructions: ~4 KB each × 5 = 20 KB
- Worst-case co-loading: ~44 KB (just under 45 KB limit)

## Validation Criteria

The bootstrap output PASSES if:
- [ ] `java.instructions.md` does NOT contain Java 17+ sections (Java 11 project — records/sealed are not available)
- [ ] 5 domain instruction files exist with correct `applyTo` patterns matching actual module paths
- [ ] `implementor.agent.md` mentions `@Stateless`, `@Inject`, `CDI`, `JAX-RS`, Java 11
- [ ] `dependency-analyzer` agent exists and mentions the 12 module names
- [ ] copilot-instructions.md ≤ 4 KB (enforced at limit for Enterprise)
- [ ] Phase 3 checkpoint was generated (`.github/.phase3-checkpoint.md`)
- [ ] Context pressure estimate was `high` (triggering hard stop in Phase 2)
- [ ] No Generic package name `com.company.project` anywhere — should be `com.erp.*`
