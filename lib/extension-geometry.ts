export type ExtensionPlacement = { aspectRatio:number; topFraction:number; leftFraction?:number; expansion?:number };
export function validExtensionPlacement(p:ExtensionPlacement) {
  return !!p && Number.isFinite(p.aspectRatio) && p.aspectRatio>=.25 && p.aspectRatio<=4
    && Number.isFinite(p.topFraction) && p.topFraction>=0 && p.topFraction<=1
    && Number.isFinite(p.leftFraction??.5) && (p.leftFraction??.5)>=0 && (p.leftFraction??.5)<=1
    && Number.isFinite(p.expansion??1) && (p.expansion??1)>=1 && (p.expansion??1)<=2;
}
/** Source-coordinate geometry shared by planner and image endpoint. No upscaling. */
export function extensionGeometry(w:number,h:number,p:ExtensionPlacement) {
  if(!validExtensionPlacement(p)||!Number.isFinite(w)||!Number.isFinite(h)||!(w>0&&h>0))throw new Error('INVALID_PLACEMENT');
  const width=Math.max(w,h*p.aspectRatio)*(p.expansion??1),height=width/p.aspectRatio;
  if(width*height>w*h*6)throw new Error('EXTENSION_TOO_LARGE');
  return {width,height,originalWidth:w,originalHeight:h,originalLeft:(width-w)*(p.leftFraction??.5),originalTop:(height-h)*p.topFraction};
}
