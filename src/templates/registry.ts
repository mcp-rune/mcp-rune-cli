export interface TemplateSpec {
  repo: string;
  subdir?: string;
  ref?: string;
}

export interface ResolvedTemplate {
  id: string;
  spec: TemplateSpec;
  source: 'registry' | 'shorthand';
}

export const TEMPLATE_REGISTRY: Record<string, TemplateSpec> = {
  bookshelf: { repo: 'mcp-rune/examples', subdir: 'bookshelf', ref: 'main' },
};

const SHORTHAND_RE =
  /^(?<repo>[^/\s#]+\/[^/\s#]+)(?:\/(?<subdir>[^\s#]+))?(?:#(?<ref>[^\s]+))?$/;

export function resolveTemplate(idOrShorthand: string): ResolvedTemplate {
  if (idOrShorthand in TEMPLATE_REGISTRY) {
    return {
      id: idOrShorthand,
      spec: TEMPLATE_REGISTRY[idOrShorthand]!,
      source: 'registry',
    };
  }

  const m = idOrShorthand.match(SHORTHAND_RE);
  if (!m?.groups) {
    const known = Object.keys(TEMPLATE_REGISTRY).join(', ');
    throw new Error(
      `Unknown template "${idOrShorthand}". ` +
        `Expected a registered name (${known}) or shorthand user/repo[/subdir][#ref].`,
    );
  }

  const { repo, subdir, ref } = m.groups;
  return {
    id: idOrShorthand,
    spec: { repo: repo!, subdir, ref },
    source: 'shorthand',
  };
}

export function templateToTigedSource(spec: TemplateSpec): string {
  const path = spec.subdir ? `${spec.repo}/${spec.subdir}` : spec.repo;
  return spec.ref ? `${path}#${spec.ref}` : path;
}
