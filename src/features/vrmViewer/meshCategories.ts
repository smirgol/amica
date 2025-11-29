export type MeshCategory = 'clothing' | 'accessories' | 'footwear' | 'body';

export interface DetectedMesh {
  name: string;
  category: MeshCategory;
}

const DETECTION_PATTERNS: Record<MeshCategory, RegExp[]> = {
  clothing: [
    /cloth/i,
    /shirt/i,
    /dress/i,
    /jacket/i,
    /coat/i,
    /pants/i,
    /trousers/i,
    /skirt/i,
    /top/i,
    /bottom/i,
    /outfits?/i,
    /uniform/i,
    /sweater/i,
    /hoodie/i,
    /vest/i,
  ],
  accessories: [
    /hat/i,
    /cap/i,
    /glasses/i,
    /eyewear/i,
    /spectacle/i,
    /scarf/i,
    /tie/i,
    /belt/i,
    /bracelet/i,
    /necklace/i,
    /ring/i,
    /jewelry/i,
    /jewel/i,
    /accessory/i,
    /ribbon/i,
    /bow/i,
    /headband/i,
    /armband/i,
  ],
  footwear: [
    /shoe/i,
    /boot/i,
    /sock/i,
    /sandal/i,
    /slipper/i,
    /footwear/i,
    /foot/i,
  ],
  body: [
    /body/i,
    /torso/i,
    /head/i,
    /face/i,
    /arm/i,
    /leg/i,
    /hand/i,
    /foot(?!wear)/i,
  ],
};

export function detectMeshCategory(meshName: string): MeshCategory | null {
  for (const [category, patterns] of Object.entries(DETECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(meshName)) {
        return category as MeshCategory;
      }
    }
  }
  return null;
}

export function detectMeshes(meshNames: string[]): DetectedMesh[] {
  return meshNames
    .map((name): DetectedMesh | null => {
      const category = detectMeshCategory(name);
      if (category && category !== 'body') {
        return { name, category };
      }
      return null;
    })
    .filter((mesh): mesh is DetectedMesh => mesh !== null);
}

export function getMeshCategoriesFromDetections(
  detections: DetectedMesh[]
): Map<MeshCategory, string[]> {
  const categories = new Map<MeshCategory, string[]>();

  for (const detection of detections) {
    if (!categories.has(detection.category)) {
      categories.set(detection.category, []);
    }
    categories.get(detection.category)!.push(detection.name);
  }

  return categories;
}
