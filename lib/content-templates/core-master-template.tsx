import React from "react";
import { readerFacingCopy } from '../content-branding';
import { subjectCrop, type FocusAsset, type CropRect } from '../subject-crop';

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
  fill?: string | { type?: string; coords?: { x1?: number; y1?: number; x2?: number; y2?: number }; colorStops?: Array<{ offset: number; color: string }> };
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
  fields?: Record<string, string>;
};

type MasterAsset = FocusAsset & {
  url?: string;
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

function bindingValue(role: string, fallback: string, copy: MasterCopy, page: string, binding?: string) {
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
  const key = binding?.startsWith('content.') ? binding.slice('content.'.length) : role;
  if (copy.fields?.[key] != null) return readerFacingCopy(copy.fields[key]);
  const row = key.match(/^(left|right)_row_([1-3])$/);
  if (row) {
    const lines = comparisonCopy(body, row[1] as 'left' | 'right').split(/\n|[；;]/u);
    return (lines[Number(row[2])-1] || '').replace(/^(進食|活動|能量來源|能量)[\s：:]+/u, '');
  }
  const direct = values[key];
  if (direct != null) return direct;
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
  crops: Record<string, ReturnType<typeof subjectCrop>>;
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

  if (role === "brand_logo" && branding.logoUrl) {
    // Image logos need a bounded header area, not the dimensions of the brand-name textbox.
    const logoWidth = Math.min(width, 180);
    const logoHeight = Math.min(Math.max(height, 80), 96);
    return React.createElement("img", { key, src: branding.logoUrl, width: logoWidth, height: logoHeight, style: { ...common, width: logoWidth, height: logoHeight, objectFit: "contain", objectPosition: "left center" } });
  }

  const dynamicAsset = roleAsset(role, primary, secondary);
  if (dynamicAsset) {
    return React.createElement("img", {
      key,
      src: dynamicAsset.url,
      width,
      height,
      style: { ...common, objectFit: object.data?.binding === "content.asset.contain" ? "contain" : "cover", objectPosition: options.crops[key]?.position || dynamicAsset.position || "center" },
    });
  }

  const type = clean(object.type).toLowerCase();
  if (type === "textbox" || type === "text" || type === "itext") {
    const fallback = clean(object.text);
    const value = role === 'brand_logo' ? branding.name : readerFacingCopy(bindingValue(role, fallback, copy, page, object.data?.binding));
    const requestedFamily = clean(object.fontFamily).toLowerCase();
    const family = requestedFamily.includes("serif") || requestedFamily.includes("明體")
      ? fonts.editorialFamily
      : fonts.family;
    const fontSize = Math.max(1, finite(object.fontSize, 20) * finite(object.scaleY, 1) * scaleY);
    const magazine = requestedFamily.startsWith('soon magazine');
    const lineHeight = finite(object.lineHeight, 1.16) * (magazine ? 1.13 : 1);
    // Fabric positions glyphs inside a 1.13-em first line; CSS includes half
    // the leading above it. Compensate without clipping the final baseline.
    const leading = magazine ? fontSize * (lineHeight - 1) / 2 : 0;
    return React.createElement("div", {
      key,
      style: {
        ...common,
        top: top - leading,
        height: height + leading * 2,
        color: typeof object.fill === "string" ? object.fill : "#171717",
        fontFamily: family,
        fontSize,
        fontStyle: object.fontStyle || "normal",
        fontWeight: object.fontWeight || 400,
        letterSpacing: finite(object.charSpacing) * finite(object.fontSize, 20) / 1000 * finite(object.scaleX, 1) * scaleX,
        lineHeight,
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
      background: fabricFillToCss(object.fill),
      // Satori's empty one-pixel background paths can collapse to a point.
      ...(height <= 1 && typeof object.fill === 'string'
        ? { borderBottom: `1px solid ${object.fill}`, background: 'transparent' }
        : {}),
      ...(width <= 1 && typeof object.fill === 'string'
        ? { borderLeft: `1px solid ${object.fill}`, background: 'transparent' }
        : {}),
      borderRadius: Math.max(finite(object.rx) * scaleX, finite(object.ry) * scaleY),
      ...(object.stroke && finite(object.strokeWidth) > 0
        ? { border: `${finite(object.strokeWidth) * Math.min(scaleX, scaleY)}px solid ${object.stroke}` }
        : {}),
    },
  });
}

export function fabricFillToCss(fill: FabricObjectJson['fill']): string {
  if(typeof fill === 'string') return fill;
  if(fill?.type === 'linear' && fill.colorStops?.length) {
    const c=fill.coords;
    const angle=90+Math.atan2(finite(c?.y2)-finite(c?.y1),finite(c?.x2)-finite(c?.x1))*180/Math.PI;
    return `linear-gradient(${angle}deg, ${fill.colorStops.map(stop=>`${stop.color} ${stop.offset*100}%`).join(', ')})`;
  }
  return 'transparent';
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
  const crops = coreMasterSubjectLayout(options);
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
  }, objects.map((object, index) => renderObject({ ...options, crops, object, key: `master-${index}`, scaleX, scaleY })),
  options.primary?.extensionOriginal || options.secondary?.extensionOriginal ? React.createElement('div', {
    style: { position: 'absolute', bottom: 12, left: 24, padding: '4px 8px', background: '#000b', color: '#fff', fontSize: 18, display: 'flex' },
  }, 'AI 延伸背景') : null);
}

export function coreMasterSubjectLayout(options: {
  design: CoreMasterPageDesign; copy: MasterCopy; page: string; primary?: MasterAsset; secondary?: MasterAsset;
}) {
  const { images, textZones } = coreMasterLayoutGeometry(options);
  return Object.fromEntries(images.map(({ key, rect, asset }) => [key, subjectCrop(asset, rect, textZones)]));
}

/** Bind the same published master used by PNG rendering to editable Fabric objects. */
export function createCoreMasterCanvas(options: Parameters<typeof renderCoreMasterPage>[0]) {
  const coordinate = inferCoordinateSize(options.design);
  const sx = OUTPUT_WIDTH / coordinate.width, sy = OUTPUT_HEIGHT / coordinate.height;
  const crops = coreMasterSubjectLayout(options);
  const objects: Record<string, unknown>[] = [];
  const visit = (items: FabricObjectJson[], prefix: string, ox = 0, oy = 0) => items.forEach((object, index) => {
    if (object.visible === false) return;
    const id = `${prefix}-${index}`, role = clean(object.data?.role).toLowerCase();
    const type = clean(object.type).toLowerCase();
    const left = ox + finite(object.left) * sx, top = oy + finite(object.top) * sy;
    let width = Math.max(1, finite(object.width, 1) * finite(object.scaleX, 1) * sx);
    let height = Math.max(1, finite(object.height, 1) * finite(object.scaleY, 1) * sy);
    if (type === 'group') { visit(object.objects || [], id, left, top); return; }
    const asset = roleAsset(role, options.primary, options.secondary);
    const logo = role === 'brand_logo' && options.branding.logoUrl;
    const imageRole = ['image','image_main','image_left','image_right','image_secondary','secondary_image','content_image','primary_image'].includes(role);
    // Never retain a reference/example image when a content binding has no asset.
    if (imageRole && !asset?.url) return;
    const src = logo || asset?.url || (type === 'image' ? object.src : null);
    const common = {left,top,width,height,originX:'left',originY:'top',scaleX:1,scaleY:1,angle:finite(object.angle),opacity:object.opacity??1,selectable:true,evented:true};
    if (src) {
      if (logo) { width = Math.min(width,180); height = Math.min(Math.max(height,80),96); }
      objects.push({...common,type:'Image',src,crossOrigin:'anonymous',width,height,
        data:{...object.data,id,kind:'image',item:'photo',label:role || '圖片',editorImageFrame:{width,height,fit:logo || !asset || object.data?.binding==='content.asset.contain'?'contain':'cover',position:logo?'0% 50%':crops[id]?.position || asset?.position || 'center'}}});
    } else if (['textbox','text','itext'].includes(type)) {
      const requestedFamily = clean(object.fontFamily).toLowerCase();
      const text = role === 'brand_logo' ? options.branding.name : readerFacingCopy(bindingValue(role,clean(object.text),options.copy,options.page,object.data?.binding));
      objects.push({...common,type:'Textbox',text,splitByGrapheme:true,fill:typeof object.fill==='string'?object.fill:'#171717',
        fontFamily:requestedFamily.includes('serif') || requestedFamily.includes('明體')?options.fonts.editorialFamily:options.fonts.family,
        fontSize:Math.max(1,finite(object.fontSize,20)*finite(object.scaleY,1)*sy),fontWeight:object.fontWeight||400,fontStyle:object.fontStyle||'normal',
        lineHeight:finite(object.lineHeight,1.16),charSpacing:finite(object.charSpacing),textAlign:object.textAlign||'left',editable:true,
        data:{...object.data,id,kind:'text',item:'body',label:role || '文字'}});
    } else {
      objects.push({...common,type:'Rect',fill:object.fill || 'transparent',stroke:object.stroke,strokeWidth:finite(object.strokeWidth)*Math.min(sx,sy),rx:finite(object.rx)*sx,ry:finite(object.ry)*sy,
        data:{...object.data,id,kind:'shape',item:'rectangle',label:role || '色塊'}});
    }
  });
  visit(options.design.canvasJson?.objects || [],'master');
  if(options.primary?.extensionOriginal || options.secondary?.extensionOriginal) objects.push({type:'Textbox',left:24,top:1310,width:220,fontSize:18,text:'AI 延伸背景',fill:'#fff',backgroundColor:'#000b',fontFamily:options.fonts.family,originX:'left',originY:'top',data:{id:'extension-label',kind:'text',item:'caption'}});
  return {version:'7.4.0',coordinateWidth:OUTPUT_WIDTH,coordinateHeight:OUTPUT_HEIGHT,background:options.design.canvasJson?.background || '#F4F0E8',objects};
}

export function coreMasterLayoutGeometry(options: {
  design: CoreMasterPageDesign; copy: MasterCopy; page: string; primary?: MasterAsset; secondary?: MasterAsset;
}) {
  const coordinate = inferCoordinateSize(options.design);
  const sx = OUTPUT_WIDTH / coordinate.width, sy = OUTPUT_HEIGHT / coordinate.height;
  const textZones: CropRect[] = [];
  const images: Array<{ key: string; rect: CropRect; asset: MasterAsset }> = [];
  const visit = (objects: FabricObjectJson[], prefix: string, ox = 0, oy = 0) => objects.forEach((o, i) => {
    if (o.visible === false || o.opacity === 0) return;
    const key = `${prefix}-${i}`, role = clean(o.data?.role).toLowerCase();
    const rect = { x: ox + finite(o.left) * sx, y: oy + finite(o.top) * sy,
      width: finite(o.width) * finite(o.scaleX, 1) * sx, height: finite(o.height) * finite(o.scaleY, 1) * sy };
    const asset = roleAsset(role, options.primary, options.secondary);
    if (asset && o.data?.binding !== 'content.asset.contain') images.push({ key, rect, asset });
    else if (['textbox', 'text', 'itext'].includes(clean(o.type).toLowerCase())
      && readerFacingCopy(bindingValue(role, clean(o.text), options.copy, options.page, o.data?.binding))) textZones.push(rect);
    if (o.objects) visit(o.objects, key, rect.x, rect.y);
  });
  visit(options.design.canvasJson?.objects || [], 'master');
  return { images, textZones };
}
