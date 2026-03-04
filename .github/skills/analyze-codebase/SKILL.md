---
name: analyze-codebase
description: 'Deep codebase analysis that detects languages, frameworks, architecture patterns, domain boundaries, coding conventions, testing approaches, CI/CD pipelines, database schemas, and external service dependencies. Produces a structured analysis report and domain map for large multi-module projects. Use when bootstrapping Copilot config, onboarding to a new project, or understanding codebase structure. Supports Java, Maven, Jakarta EE, Oracle, and enterprise architectures.'
---

# Analyze Codebase

Perform a comprehensive analysis of the target codebase to produce a structured report used by other agents and skills.

## When to Use

- Bootstrapping GitHub Copilot configuration for a project
- Onboarding to an unfamiliar codebase
- Understanding domain boundaries in a large project
- Mapping dependencies between modules
- Preparing for an architecture review

## Workflow

### Step 1: Project Structure Discovery

1. List root directory — identify top-level structure
2. Check for monorepo indicators: multiple `pom.xml`, `packages/`, workspace configs
3. Identify key directories: `src/`, `lib/`, `config/`, `docs/`, `.github/`, `scripts/`
4. Check for existing Copilot config: `.github/copilot-instructions.md`, `.github/agents/`

### Step 2: Tech Stack Detection

Read build configuration files:

**Java/Maven**: Read `pom.xml` for:
- `<java.version>`, compiler source/target
- Dependencies: Jakarta EE, Spring, Quarkus, MicroProfile
- Test dependencies: JUnit 5, Mockito, WireMock, Arquillian, Testcontainers
- Plugins: surefire, failsafe, JaCoCo, checkstyle, spotbugs
- Profiles: dev, test, prod
- Multi-module: `<modules>` section

**Other stacks**: Check `package.json`, `tsconfig.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `build.gradle`, `Gemfile`, `composer.json`, `*.csproj`

### Step 3: Architecture Pattern Detection

Scan `src/main/java/` package structure:
- `controller/service/repository/model` → Layered Architecture
- `port/adapter/domain` → Hexagonal
- `usecase/gateway/entity` → Clean Architecture
- Feature-based directories → Feature Modules
- Multiple service directories → Microservices

### Step 4: Domain Mapping (Large Codebases)

For projects with multiple business domains:

1. Scan package hierarchy under main source root
2. Identify domain packages (e.g., `com.company.project.orders`, `.customers`, `.payments`)
3. For each domain, identify:
   - Entities/models
   - APIs/endpoints
   - Services
   - Repository/DAO
   - External calls to other domains
4. Map inter-domain dependencies via import analysis

### Step 5: Coding Conventions

Sample 5-10 source files and identify:
- Naming conventions (variables, classes, methods, constants)
- File organization within packages
- Import ordering and grouping
- Error handling patterns
- Logging patterns (framework, format)
- Documentation style (JavaDoc, comments)

### Step 6: Testing Patterns

Check `src/test/java/` for:
- Test framework (JUnit 5, JUnit 4, TestNG)
- Mocking approach (Mockito, WireMock, Fakes)
- Test naming conventions
- Test data patterns (builders, fixtures, factories)
- Integration test setup
- Coverage tools

### Step 7: Infrastructure & DevOps

Check for:
- CI/CD: `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`
- Containerization: `Dockerfile`, `docker-compose.yml`, `devcontainer.json`
- Database: migration files (Flyway/Liquibase), schema definitions
- Configuration: `application.yml`, `application.properties`, env files

## Output

Produce a structured markdown report following the format defined in the `@codebase-analyzer` agent, including:

1. Project overview
2. Tech stack with versions
3. Architecture description
4. Domain map (for large projects)
5. Coding conventions detected
6. Testing approach
7. Recommendations for agents, skills, and instructions

## Validation

- [ ] All config files were actually read (not guessed)
- [ ] At least 5 source files were sampled for conventions
- [ ] Domain map covers all major packages
- [ ] Recommendations are justified by analysis
