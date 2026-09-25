export type CoreTemplatePageRole = {
  position: string;
  role: string;
  required?: boolean;
  repeatable?: boolean;
};

type ContractRecord = Record<string, unknown>;

function record(value: unknown): ContractRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ContractRecord
    : null;
}

export function coreTemplatePageRoles(contract: unknown): CoreTemplatePageRole[] {
  const root = record(contract);
  const structure = record(root?.structure);
  const source = Array.isArray(structure?.page_roles)
    ? structure.page_roles
    : Array.isArray(root?.page_roles)
      ? root.page_roles
      : [];
  return source.flatMap((item, index) => {
    const row = record(item);
    const role = typeof row?.role === "string" ? row.role.trim().toLowerCase() : "";
    if (!role) return [];
    return [{
      position: typeof row?.position === "string" ? row.position : String(index + 1).padStart(2, "0"),
      role,
      required: row?.required !== false,
      repeatable: row?.repeatable === true,
    }];
  });
}

export function isFixedCoreTemplate(contract: unknown) {
  const root = record(contract);
  const structure = record(root?.structure);
  const roles = coreTemplatePageRoles(contract);
  const declaredCount = Number(structure?.page_count);
  return structure?.mode === "fixed"
    && roles.length > 0
    && Number.isInteger(declaredCount)
    && declaredCount === roles.length;
}

export function applyCoreTemplateStructure(
  current: unknown,
  contract: unknown,
) {
  if (!isFixedCoreTemplate(contract)) return Array.isArray(current) ? current : [];
  const existing = Array.isArray(current) ? current : [];
  const available=coreTemplatePageRoles(contract);
  return existing.map((item, index) => {
    const previous = existing[index] && typeof existing[index] === "object"
      ? existing[index] as ContractRecord
      : {};
    const requested=String(previous.role||previous.layout||'');
    const role=index===0?'cover':index===existing.length-1?'end':['cover','end'].includes(requested)?'longform':requested;
    const page=available.find(p=>p.role===role)||available.find(p=>p.role==='longform')||available[0];
    return {
      ...previous,
      page: `P.${index + 1}`,
      role: page.role,
      layout: page.role,
      templatePosition: page.position,
      templateRequired: index===0||index===existing.length-1,
      templateRepeatable: index>0&&index<existing.length-1,
    };
  });
}
