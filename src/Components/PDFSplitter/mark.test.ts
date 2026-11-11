import { centeredRotated, cornerPos, cornerStamp, dataUrlBytes, hasMark, watermarkAngle, watermarkWidth } from "./mark";

describe("cornerPos", () => {
  // pw=20, ph=10 — content corners: TL(0,10) TR(20,10) BR(20,0) BL(0,0)
  it("keeps corners in place with no rotation", () => {
    expect(cornerPos("bottomRight", 0, 20, 10)).toEqual({ x: 20, y: 0 });
    expect(cornerPos("topLeft", 0, 20, 10)).toEqual({ x: 0, y: 10 });
  });

  it("rotates corners clockwise with the page", () => {
    // /Rotate 90 turns the sheet clockwise: visual bottom-right shows content top-right
    expect(cornerPos("bottomRight", 90, 20, 10)).toEqual({ x: 20, y: 10 });
    expect(cornerPos("topLeft", 90, 20, 10)).toEqual({ x: 0, y: 0 });
    expect(cornerPos("bottomLeft", 90, 20, 10)).toEqual({ x: 20, y: 0 });
    // half turn: opposite corners
    expect(cornerPos("bottomRight", 180, 20, 10)).toEqual({ x: 0, y: 10 });
    expect(cornerPos("topRight", 180, 20, 10)).toEqual({ x: 0, y: 0 });
    // three-quarter turn
    expect(cornerPos("bottomRight", 270, 20, 10)).toEqual({ x: 0, y: 0 });
    expect(cornerPos("topLeft", 270, 20, 10)).toEqual({ x: 20, y: 10 });
  });

  it("normalizes the angle", () => {
    expect(cornerPos("bottomRight", 450, 20, 10)).toEqual(cornerPos("bottomRight", 90, 20, 10));
    expect(cornerPos("bottomRight", -90, 20, 10)).toEqual(cornerPos("bottomRight", 270, 20, 10));
  });
});

describe("cornerStamp", () => {
  it("pulls the image inside the corner by the margin", () => {
    // w=4, h=2, m=1 → right edge 1 from the side, bottom edge 1 up
    expect(cornerStamp(0, 20, 10, 4, 2, 1)).toEqual({ x: 15, y: 1 });
    // /Rotate 90 anchors the same image near content top-right
    expect(cornerStamp(90, 20, 10, 4, 2, 1)).toEqual({ x: 15, y: 7 });
  });
});

describe("centeredRotated", () => {
  it("centers an unrotated image", () => {
    expect(centeredRotated(10, 5, 4, 2, 0)).toEqual({ x: 8, y: 4 });
  });

  it("compensates for a half turn", () => {
    expect(centeredRotated(10, 5, 4, 2, 180)).toEqual({ x: 12, y: 6 });
  });
});

describe("watermark sizing and angle", () => {
  it("spans 80% of the page diagonal", () => {
    expect(watermarkWidth(3, 4)).toBeCloseTo(4);
  });

  it("tilts against the page turn to stay diagonal on screen", () => {
    expect(watermarkAngle(0)).toBe(45);
    expect(watermarkAngle(90)).toBe(-45);
    expect(watermarkAngle(450)).toBe(-45);
  });
});

describe("dataUrlBytes", () => {
  it("decodes base64 payloads", () => {
    const url = "data:image/png;base64," + btoa("AB!");
    expect(Array.from(dataUrlBytes(url))).toEqual([65, 66, 33]);
  });
});

describe("hasMark", () => {
  it("is true when there is text or a signature", () => {
    expect(hasMark({ watermark: "", opacity: 0.2, signature: null })).toBe(false);
    expect(hasMark({ watermark: " DRAFT ", opacity: 0.2, signature: null })).toBe(true);
    expect(hasMark({ watermark: "", opacity: 0.2, signature: "data:image/png;base64,xx" })).toBe(true);
  });
});
