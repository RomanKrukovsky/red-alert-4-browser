# Content Pipeline & Validation Schema

## Overview
Game content specs (units, buildings, weapons, factions, maps) are defined as typed JSON data validated by Zod schemas in `packages/content-schema`.

## Validation CLI
Run `pnpm content:validate` to check relational integrity across all database entries:
- Missing weapon references
- Invalid prerequisite building IDs
- Negative cost or build time values

## Content Hash
A SHA-256 content hash is generated at build time (`computeContentHash()`) to ensure that client, server, and replay files share 100% identical data definitions.
