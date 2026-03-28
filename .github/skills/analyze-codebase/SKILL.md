---
name: analyze-codebase
description: 'Deep multi-stack codebase analysis with per-stack detection recipes. Scans project structure, build configs, source code, architecture patterns, domain boundaries, coding conventions, testing approaches, CI/CD pipelines, and external dependencies. Produces a structured analysis report. Supports Java/Maven/Gradle, .NET/C#, Python/Django/FastAPI, TypeScript/React, PHP/Laravel/Symfony, Android/Kotlin, iOS/Swift.'
---

# Analyze Codebase — Deep Multi-Stack Scan

Perform a thorough analysis of the target codebase. This skill provides detailed per-stack detection recipes used during bootstrap Phase 1 and standalone analysis.

> **Quality rule**: Read actual files, don't guess. Every claim in the report must be backed by a specific file you read.

## Relationship to Bootstrap

During bootstrap, the `generate-copilot-config` skill Phase 1 defines the **3-Round Scan Protocol** (the execution strategy). This skill provides the **per-stack detection recipes** (what to look for in each stack's build files and source code). Both work together: the scan protocol tells you _how_ to scan efficiently; this skill tells you _what_ to extract per stack.

## Tool Strategy

Use the most efficient tool for each scan task:

| Task | Preferred Approach |
|------|-------------------|
| Directory structure | Terminal: `find . -maxdepth 3 -type f` (exclude build artifacts) |
| File count and language distribution | Terminal: `find` piped to `sed`, `sort`, `uniq -c` |
| All build file contents at once | Terminal: compound `find -exec` reading all build files |
| Representative source files | `#codebase` semantic search: "service layer", "entity model" |
| Specific file verification | Direct file read |
| Pattern detection across files | Terminal: `grep -r` for annotations, imports |

**Rule**: Run bulk discovery first (directory tree + all build files in one compound command), then targeted reads. Never read files one-by-one when a compound command can get them all at once.

## Minimum Scan Requirements

Before producing the report, ensure you have:
- [ ] Read all build config files — use a compound terminal command, not one-by-one reads
- [ ] Sampled ≥ 3 source files per major domain to detect conventions
- [ ] Read representative entity/model classes per domain (1-3 per domain)
- [ ] Read ≥ 2 service classes per domain to understand business logic patterns
- [ ] Read ≥ 2 test classes to detect testing patterns and conventions
- [ ] Checked for CI/CD, Docker, devcontainer configurations
- [ ] Scanned for external service integrations (HTTP clients, queues, cloud SDKs)

## Workflow

### Step 1: Project Structure Discovery

Use terminal for efficient bulk discovery:

1. Get directory tree and file distribution in one compound command (see Tool Strategy)
2. Check for monorepo indicators: multiple build files, `packages/`, workspace configs
3. Identify key directories: `src/`, `lib/`, `config/`, `docs/`, `.github/`, `scripts/`
4. Check for existing Copilot config: `.github/copilot-instructions.md`, `.github/agents/`

### Step 2: Tech Stack Detection — Per-Stack Recipe

#### Java/Maven
Read `pom.xml` (root AND every module):
- `<java.version>`, compiler source/target
- `<modules>` section → list all submodules
- Dependencies: Jakarta EE (`jakarta.*`), Spring (`spring-boot-starter-*`), Quarkus, MicroProfile
- Test deps: JUnit 5, Mockito, WireMock, Arquillian, Testcontainers
- Plugins: surefire, failsafe, JaCoCo, checkstyle, spotbugs, spotless
- Profiles: dev, test, prod, integration
- BOM / dependency management

#### Java/Gradle
Read `build.gradle` or `build.gradle.kts` (root AND every subproject):
- Java/Kotlin version, source compatibility
- `settings.gradle(.kts)` → `include` statements for subprojects
- Dependencies: same as Maven detection
- Plugins: application, java-library, spring-boot, android

#### .NET / C#
Read `*.sln` → list all `*.csproj` files:
- Target framework (`.net8.0`, `.net6.0`)
- NuGet packages: EF Core, ASP.NET Core, MediatR, FluentValidation, AutoMapper
- Test projects: xUnit, NUnit, MSTest, FluentAssertions, Moq
- Project references (inter-project dependencies)
- `Program.cs` / `Startup.cs` → DI registration, middleware pipeline

#### Python
Read `pyproject.toml`, `requirements.txt`, `setup.py`, or `Pipfile`:
- Python version, package manager (pip, poetry, pipenv)
- Framework: Django (`INSTALLED_APPS` in `settings.py`), FastAPI (`main.py` router includes), Flask
- ORM: SQLAlchemy, Django ORM, Tortoise
- Test: pytest, unittest, pytest-asyncio, factory_boy, faker
- Linting: ruff, black, flake8, mypy, isort
- Scan `manage.py` commands for Django projects
- Scan `alembic/` or `migrations/` for DB migration patterns

#### TypeScript / React / Node.js
Read `package.json` (root AND workspace packages if monorepo):
- Node version, package manager (npm, yarn, pnpm)
- Framework: React, Next.js, Vue, Angular, Express, NestJS, Fastify
- `tsconfig.json` → strict mode, module resolution, paths
- State management: Redux, Zustand, React Query, MobX
- Testing: Jest, Vitest, React Testing Library, Cypress, Playwright
- Linting: ESLint config, Prettier config
- Build: webpack, vite, esbuild, turbopack
- Scan `src/` for: `components/`, `hooks/`, `services/`, `utils/`, `api/`, `store/`, `pages/`, `features/`

#### PHP
Read `composer.json`:
- PHP version, framework: Laravel, Symfony, CodeIgniter
- `config/app.php` (Laravel) or `config/services.yaml` (Symfony)
- ORM: Eloquent, Doctrine
- Testing: PHPUnit, Pest, Mockery
- Scan `app/Models/`, `app/Http/Controllers/`, `database/migrations/`
- Check for FormRequest, Policy, Event/Listener patterns

#### Mobile — Android
Read `build.gradle.kts` with Android plugins:
- Kotlin version, Compose version, minSdk/targetSdk
- Dependencies: Hilt/Dagger, Room, Retrofit, Coroutines, Navigation
- Module structure: `:app`, `:core`, `:feature-*`, `:data`
- Scan for ViewModel, Repository, UseCase patterns

#### Mobile — iOS
Read `Package.swift` or `*.xcodeproj/project.pbxproj`:
- Swift version, iOS deployment target
- Dependencies: Alamofire, Kingfisher, SwiftData, CoreData
- Architecture: MVVM, VIPER, TCA
- Scan for ObservableObject, @Observable, async/await patterns

### Step 3: Architecture Pattern Detection

Scan source directory structure:
- `controller/service/repository/model` → **Layered Architecture**
- `port/adapter/domain` → **Hexagonal**
- `usecase/gateway/entity` → **Clean Architecture**
- `features/` or `modules/` with self-contained dirs → **Feature Modules**
- Multiple independent service directories → **Microservices**
- `presentation/domain/data` layers → **MVVM / Clean (Mobile)**

### Step 4: Domain Mapping

For projects with multiple business domains:

1. Scan package/directory hierarchy under main source root
2. Identify domain boundaries (e.g., `orders/`, `customers/`, `payments/`)
3. For EACH domain, count and list:
   - Entities/models (exact names)
   - APIs/endpoints (exact routes)
   - Services (exact class names)
   - Repository/DAO classes
   - External calls to other domains (import analysis)
4. Map inter-domain dependencies: which domain calls which
5. Classify complexity: `low` (≤3 entities), `medium` (4-8), `high` (9+)

### Step 5: Coding Conventions

Sample ≥ 10 source files across different domains and identify:
- Naming conventions (variables, classes, methods, constants, packages/namespaces)
- File organization within packages/directories
- Import ordering and grouping
- Error handling patterns (exception types, error responses)
- Logging patterns (framework, structured/unstructured, log levels)
- Documentation style (JavaDoc, JSDoc, docstrings, inline comments)
- Null handling (Optional, nullable types, null checks)

### Step 6: Testing Patterns

Scan test directories:
- Test framework and runner (JUnit 5, pytest, Jest, xUnit, PHPUnit)
- Mocking approach (Mockito, unittest.mock, Jest mocks, Moq, Fakes)
- Test naming convention (should_X_when_Y, test_X, descriptive names)
- Test data patterns (builders, fixtures, factories, faker)
- Integration test setup (Testcontainers, Docker, in-memory DB)
- Coverage tools and targets
- Test organization (by class, by feature, nested classes)

### Step 7: Infrastructure & DevOps

Check for:
- **CI/CD**: `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`, `.azure-pipelines.yml`
- **Containerization**: `Dockerfile`, `docker-compose.yml`, `.devcontainer/`
- **Database**: migration files (Flyway, Liquibase, Alembic, Laravel migrations), schema definitions
- **Configuration**: `application.yml`, `appsettings.json`, `.env` files, config profiles
- **API Documentation**: Swagger/OpenAPI specs, Postman collections
- **Agile references**: Jira project keys in comments/commits, Azure DevOps work item IDs

## Output

Structured markdown report:

1. **Project overview** — name, purpose, size classification
2. **Tech stack** — languages, frameworks, build tools, with versions
3. **Architecture** — detected pattern, layer structure
4. **Module map** — all modules with sizes and inter-dependencies
5. **Domain map** — business domains with entities, services, complexity
6. **Coding conventions** — naming, patterns, documentation style
7. **Testing approach** — framework, mocking, coverage
8. **Infrastructure** — CI/CD, containers, databases, config management
9. **Recommendations** — which agents, skills, instructions to generate and WHY

## Validation Checklist

- [ ] All build config files were read via bulk command (not guessed from file extension alone)
- [ ] At least 3 source files per major domain were sampled for conventions (state which files)
- [ ] Representative entity/model classes per domain were read
- [ ] Domain map covers all major packages/directories
- [ ] Recommendations are justified by specific findings from analysis
- [ ] No placeholder text like "TBD" or "to be determined" in report
- [ ] Every tech stack claim points to a specific file as evidence
- [ ] Uncertain findings are marked with `[ASSUMPTION]` or `[NEEDS CLARIFICATION]`
