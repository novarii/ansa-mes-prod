# Ansa MES - Change Log

## Version Format

Versions are formatted as: `YYYYMMDD-HHMM` (timestamp-based) or semantic versioning `vX.Y.Z`

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
