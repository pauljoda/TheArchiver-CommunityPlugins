# Changelog

## [Unreleased]

### Changed

- Replace inline type definitions with imports from core `plugin-api.d.ts`

## 2.0.1

- Refactor file downloads to use core `helpers.io.downloadFile` with custom headers and redirect support
- Remove manual stream pipeline and dynamic `fs`/`stream` imports
- No user-facing behavior changes

## 2.0.0

- Initial release with authenticated Archive.org downloads
- Support for recursive directory traversal
- Dual auth: cookie-based for HTML pages, S3 Authorization for file downloads
- Skip-if-exists for resumable downloads
