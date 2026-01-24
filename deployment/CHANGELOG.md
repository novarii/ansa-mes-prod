# Ansa MES - Change Log

## Version Format

Versions are formatted as: `YYYYMMDD-HHMM` (timestamp-based) or semantic versioning `vX.Y.Z`

---

## [v1.1.0] - 2026-01-24

### Added
- **Phase 19: Material Backflush (LIFO)** - Automatic inventory reduction when production is completed
- Stock status indicator in work order detail page showing overall material availability
- Windows Server deployment guide with IIS configuration and PowerShell scripts

### Changed
- Refactored stock status display from per-item table column to page-level indicator
- Improved pick list table UI by removing redundant status column

### Fixed
- **Critical: React 19 test compatibility** - Fixed all Vitest tests failing with "React.act is not a function"
  - Set NODE_ENV='test' in Vitest config to load React development build
  - Added IS_REACT_ACT_ENVIRONMENT flag as required by React 19
- Fixed backflush service to properly reference production order items (removed ItemCode from BaseType=202 lines)
- Fixed ESLint dependency-checks warnings for vitest imports
- Corrected environment variable names in deployment templates

### Technical Details
- Upgraded @testing-library/react to 16.3.2 for full React 19 support
- Material backflush uses LIFO (Last-In-First-Out) allocation strategy
- Backflush creates inventory transfer with proper SAP B1 document references

---

## [Unreleased]

### Added
- Initial production deployment package
- On-premises installation scripts
- Nginx reverse proxy configuration
- Systemd service integration

### Features
- Work order management (list, detail, filtering)
- Production entry (accepted/rejected quantities)
- Activity tracking (start, stop, resume, finish)
- Team view (active workers, machine status)
- Calendar view (work orders by date)
- Two-step authentication (PIN + station selection)
- SAP B1 integration (HANA read + Service Layer write)

### Technical Details
- NestJS 11 backend with TypeScript
- React 19 frontend with Tailwind CSS v4
- Direct HANA connection with connection pooling
- SAP B1 Service Layer integration with session management
- Automated batch number generation

---

## Instructions for Updating

When releasing a new version, add an entry in this format:

```markdown
## [vX.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Security
- Security improvements

### Breaking Changes
- Any breaking changes that require configuration updates
```

**Example:**

```markdown
## [v1.1.0] - 2026-02-15

### Added
- Real-time notifications for production order updates
- Export production reports to PDF

### Changed
- Improved work order filtering performance
- Updated Turkish translations for error messages

### Fixed
- Fixed batch number sequence not resetting daily
- Corrected rejected quantity warehouse routing

### Security
- Updated dependencies to patch security vulnerabilities
```
