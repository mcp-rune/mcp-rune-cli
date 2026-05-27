/**
 * Tool exposure profiles.
 *
 * Selected at startup via MCP_PROFILE. Same image, same binary, different surface.
 *
 * - `full`     — everything (default).
 * - `chat`     — apps enabled; raw-JSON data tools hidden so the LLM doesn't echo
 *                records that an app has already rendered.
 * - `agent`    — apps disabled; data and action tools enabled for headless callers.
 * - `classify` — only `update_model` is exposed (token-minimal classification).
 *
 * Each profile carries:
 *   - `tools`        — allowlist of tool names (null = all enabled tools)
 *   - `toolsExclude` — denylist applied after allowlist (null = no exclusions)
 *   - `apps`         — 'enabled' | 'disabled'
 */

export const PROFILES = {
  full: { tools: null, toolsExclude: null, apps: 'enabled' },
  chat: {
    tools: null,
    toolsExclude: ['find_records', 'search_records', 'list_models'],
    apps: 'enabled',
  },
  agent: { tools: null, toolsExclude: null, apps: 'disabled' },
  classify: { tools: ['update_model'], toolsExclude: null, apps: 'disabled' },
};

export function getProfile(name) {
  const profile = PROFILES[name];
  if (!profile) {
    throw new Error(
      `Unknown MCP_PROFILE "${name}". Valid: ${Object.keys(PROFILES).join(', ')}`,
    );
  }
  return profile;
}
