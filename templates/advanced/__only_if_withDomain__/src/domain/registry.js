/**
 * Domain registry — workflows, business rules, and domain knowledge.
 *
 * Add workflows to `./workflows/` and register them here. Each workflow
 * describes a multi-step process the LLM should follow; the framework
 * surfaces them via the domain tools (`get_workflow_step`, `suggest_workflow`,
 * `check_business_rules`).
 */

import { DomainRegistry, WorkflowRegistry, RuleSet, DomainKnowledge } from '@mcp-rune/mcp-rune/domain';

export function createDomainRegistry() {
  const workflows = new WorkflowRegistry([
    // ...spread workflow arrays imported from ./workflows/
  ]);

  return new DomainRegistry({
    knowledge: new DomainKnowledge(),
    rules: new RuleSet(),
    workflows,
  });
}
