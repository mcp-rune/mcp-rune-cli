/**
 * Domain registry — workflows, business rules, and domain knowledge.
 *
 * Organise domain items into DomainModule objects (one per domain area) and
 * spread them into InMemoryDomainAdapter. Each module can export concepts,
 * rules, and workflows together, replacing the separate per-resource files.
 *
 * The framework surfaces domain knowledge via the domain tools:
 * `get_domain_context`, `get_workflow_step`, `suggest_workflow`, `check_business_rules`.
 */

import { DomainRegistry, InMemoryDomainAdapter } from '@mcp-rune/mcp-rune/domain'
import type { DomainModule } from '@mcp-rune/mcp-rune/domain'

// Define domain modules here or import them from ./modules/
// Example: import { catchupModule } from './modules/catchup.js'
const domainModules: DomainModule[] = [
  // { concepts: [...], rules: [...], workflows: [...] }
]

export function createDomainRegistry(): DomainRegistry {
  return new DomainRegistry({
    adapter: new InMemoryDomainAdapter(domainModules)
  })
}
