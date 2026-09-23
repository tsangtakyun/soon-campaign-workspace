import React from "react";

export type CoreMasterRole = "cover" | "longform" | "split" | "comparison" | "feature" | "end";

type FabricData = {
  binding?: string;
  role?: string;
};

type FabricObjectJson = {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  visible?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: string;
  fontFamily?: string;
  lineHeight?: number;
  charSpacing?: number;
  textAlign?: "left" | "center" | "right";
  src?: string;
  objects?: FabricObjectJson[];
  data?: FabricData;
};

export type CoreMasterPageDesign = {
  canvasJson?: {
    background?: string;
    objects?: FabricObjectJson[];
  };
  canvasWidth?: number;
  canvasHeight?: number;
  coordinateWidth?: number;
  coordinateHeight?: number;
};

type CoreMasterContract = {
  master_designs?: Partial<Record<CoreMasterRole, CoreMasterPageDesign>>;
};

type MasterCopy = {
  headline?: string;
  subheadline?: string;
  body?: string[];
};

type MasterAsset = {
  url?: string;
  position?: "center" | "top" | "bottom" | "left" | "right";
};

type MasterBranding = {
  logoUrl?: string | null;
  name: string;
};

type MasterFonts = {
  family: string;
  editorialFamily: string;
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1350;
const LEGACY_EDITOR_WIDTH = 432;
const LEGACY_EDITOR_HEIGHT = 540;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function getCoreMasterPageDesign(contract: unknown, role: CoreMasterRole) {
  const root = asRecord(contract) as CoreMasterContract | null;
  const designs = asRecord(root?.master_designs);
  const design = designs?.[role];
  return asRecord(design) as CoreMasterPageDesign | null;
}

export function hasCoreMasterDesigns(contract: unknown) {
  const root = asRecord(contract) as CoreMasterContract | null;
  const designs = asRecord(root?.master_designs);
  return Boolean(designs && Object.keys(designs).length > 0);
}

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function inferCoordinateSize(design: CoreMasterPageDesign) {
  if (finite(design.coordinateWidth) >= 100 && finite(design.coordinateHeight) >= 100) {
    return { width: finite(design.coordinateWidth), height: finite(design.coordinateHeight) };
  }
  const objects = Array.isArray(design.canvasJson?.objects) ? design.canvasJson.objects : [];
  const maxRight = objects.reduce((max, object) => Math.max(
    max,
    finite(object.left) + finite(object.width) * finite(object.scaleX, 1),
  ), 0);
  const maxBottom = objects.reduce((max, object) => Math.max(
    max,
    finite(object.top) + finite(object.height) * finite(object.scaleY, 1),
  ), 0);
  // Early Core drafts recorded output dimensions while serialising the 432×540
  // editor canvas. Detect those drafts so their coordinates still render 1:1.
  if (maxRight <= LEGACY_EDITOR_WIDTH * 1.2 && maxBottom <= LEGACY_EDITOR_HEIGHT * 1.2) {
    return { width: LEGACY_EDITOR_WIDTH, height: LEGACY_EDITOR_HEIGHT };
  }
  return {
    width: Math.max(100, finite(design.canvasWidth, OUTPUT_WIDTH)),
    height: Math.max(100, finite(design.canvasHeight, OUTPUT_HEIGHT)),
  };
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function comparisonCopy(body: string[], side: "left" | "right") {
  const legacy = String(body[2] || "").split(/[；;]/, 2);
  if (side === "left") return body[3] ? body[2] : legacy[0] || "";
  return body[3] || legacy[1] || "";
}

function bindingValue(role: string, fallback: string, copy: MasterCopy, page: string) {
  const body = Array.isArray(copy.body) ? copy.body.filter(Boolean) : [];
  const pageNumber = page.split(/[\s/]+/u)[0] || page;
  const values: Record<string, string> = {
    eyebrow: clean(copy.subheadline),
    headline: clean(copy.headline),
    body: body.join("\n"),
    subheadline: clean(copy.subheadline),
    body_1: body[0] || "",
    body_2: body[1] || "",
    body_3: body[2] || "",
    body_4: body[3] || "",
    body_5: body[4] || "",
    body_6: body[5] || "",
    body_7: body[6] || "",
    left_body: body[2] || comparisonCopy(body, "left"),
    right_body: body[3] || comparisonCopy(body, "right"),
    option_a: body[0] || "",
    option_b: body[1] || "",
    label_left: body[0] || "",
    label_right: body[1] || "",
    highlight: body.length >= 5 ? body[4] : body[2] || "",
    source: body.at(-1) || "",
    question: body[1] || "",
    cta: body[2] || body.at(-1) || "了解更多",
    feature_title_1: body[0] || "",
    feature_body_1: body[1] || "",
    feature_title_2: body[2] || "",
    feature_body_2: body[3] || "",
    feature_title_3: body[4] || "",
    feature_body_3: body[5] || "",
    page_number: pageNumber,
  };
  const direct = values[role];
  if (direct != null && direct !== "") return direct;
  return fallback.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => values[key.toLowerCase()] ?? "");
}

function roleAsset(role: string, primary?: MasterAsset, secondary?: MasterAsset) {
  if (["image_right", "image_secondary", "secondary_image"].includes(role)) return secondary?.url ? secondary : primary;
  if (["image", "image_main", "image_left", "content_image", "primary_image"].includes(role)) return primary;
  return undefined;
}

function renderObject(options: {
  object: FabricObjectJson;
  key: string;
  scaleX: number;
  scaleY: number;
  copy: MasterCopy;
  page: string;
  primary?: MasterAsset;
  secondary?: MasterAsset;
  branding: MasterBranding;
  fonts: MasterFonts;
}): React.ReactNode {
  const { object, key, scaleX, scaleY, copy, page, primary, secondary, branding, fonts } = options;
  if (object.visible === false) return null;
  const role = clean(object.data?.role).toLowerCase();
  const left = finite(object.left) * scaleX;
  const top = finite(object.top) * scaleY;
  const width = Math.max(1, finite(object.width, 1) * finite(object.scaleX, 1) * scaleX);
  const height = Math.max(1, finite(object.height, 1) * finite(object.scaleY, 1) * scaleY);
  const common: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    width,
    height,
    display: "flex",
    opacity: object.opacity == null ? 1 : finite(object.opacity, 1),
    overflow: "hidden",
    transformOrigin: "top left",
    ...(object.angle ? { transform: `rotate(${finite(object.angle)}deg)` } : {}),
  };

  if (role === "brand_logo") {
    return branding.logoUrl
      ? React.createElement("img", { key, src: branding.logoUrl, width, height, style: { ...common, objectFit: "contain" } })
      : React.createElement("div", { key, style: { ...common, alignItems: "center", justifyContent: "center", fontFamily: fonts.family, fontSize: Math.max(14, height * 0.42), fontWeight: 700 } }, branding.name);
  }

  const dynamicAsset = roleAsset(role, primary, secondary);
  if (dynamicAsset) {
    return React.createElement("img", {
      key,
      src: dynamicAsset.url,
      width,
      height,
      style: { ...common, objectFit: object.data?.binding === "content.asset.contain" ? "contain" : "cover", objectPosition: dynamicAsset.position || "center" },
    });
  }

  const type = clean(object.type).toLowerCase();
  if (type === "textbox" || type === "text" || type === "itext") {
    const fallback = clean(object.text);
    const value = bindingValue(role, fallback, copy, page);
    const requestedFamily = clean(object.fontFamily).toLowerCase();
    const family = requestedFamily.includes("serif") || requestedFamily.includes("明體")
      ? fonts.editorialFamily
      : fonts.family;
    return React.createElement("div", {
      key,
      style: {
        ...common,
        color: typeof object.fill === "string" ? object.fill : "#171717",
        fontFamily: family,
        fontSize: Math.max(1, finite(object.fontSize, 20) * scaleY),
        fontStyle: object.fontStyle || "normal",
        fontWeight: object.fontWeight || 400,
        letterSpacing: finite(object.charSpacing) * finite(object.fontSize, 20) / 1000 * scaleX,
        lineHeight: finite(object.lineHeight, 1.16),
        textAlign: object.textAlign || "left",
        whiteSpace: "pre-wrap",
        alignItems: "flex-start",
        justifyContent: object.textAlign === "center" ? "center" : object.textAlign === "right" ? "flex-end" : "flex-start",
      },
    }, value);
  }

  if (type === "image") {
    if (!object.src) return null;
    return React.createElement("img", { key, src: object.src, width, height, style: { ...common, objectFit: "contain" } });
  }

  if (type === "group") {
    const children = Array.isArray(object.objects) ? object.objects : [];
    return React.createElement("div", { key, style: common }, children.map((child, index) => renderObject({
      ...options,
      object: { ...child, left: finite(child.left), top: finite(child.top) },
      key: `${key}-${index}`,
      scaleX,
      scaleY,
    })));
  }

  return React.createElement("div", {
    key,
    style: {
      ...common,
      background: typeof object.fill === "string" ? object.fill : "transparent",
      borderRadius: Math.max(finite(object.rx) * scaleX, finite(object.ry) * scaleY),
      ...(object.stroke && finite(object.strokeWidth) > 0
        ? { border: `${finite(object.strokeWidth) * Math.min(scaleX, scaleY)}px solid ${object.stroke}` }
        : {}),
    },
  });
}

export function renderCoreMasterPage(options: {
  design: CoreMasterPageDesign;
  copy: MasterCopy;
  page: string;
  primary?: MasterAsset;
  secondary?: MasterAsset;
  branding: MasterBranding;
  fonts: MasterFonts;
}) {
  const { design } = options;
  const coordinate = inferCoordinateSize(design);
  const scaleX = OUTPUT_WIDTH / coordinate.width;
  const scaleY = OUTPUT_HEIGHT / coordinate.height;
  const objects = Array.isArray(design.canvasJson?.objects) ? design.canvasJson.objects : [];
  return React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      position: "relative",
      overflow: "hidden",
      background: design.canvasJson?.background || "#F4F0E8",
      fontFamily: options.fonts.family,
    },
  }, objects.map((object, index) => renderObject({ ...options, object, key: `master-${index}`, scaleX, scaleY })));
}
