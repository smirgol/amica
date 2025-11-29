import { MeshCategory, DetectedMesh, getMeshCategoriesFromDetections } from './meshCategories';

export interface MeshInfo {
  displayName: string;
  enabled: boolean;
  category: MeshCategory | 'unknown';
  userAssigned: boolean;
}

export interface MeshRegistry {
  modelUrl: string;
  meshes: Map<string, MeshInfo>;
  meshesByCategory: Map<MeshCategory | 'unknown', string[]>;
  lastUpdated: number;
}

const STORAGE_KEY_PREFIX = 'amica_mesh_registry_';
const STORAGE_VERSION = 1;

function getStorageKey(modelUrl: string): string {
  return `${STORAGE_KEY_PREFIX}${modelUrl}_v${STORAGE_VERSION}`;
}

function serializeRegistry(registry: MeshRegistry): string {
  return JSON.stringify({
    modelUrl: registry.modelUrl,
    meshes: Array.from(registry.meshes.entries()),
    meshesByCategory: Array.from(registry.meshesByCategory.entries()),
    lastUpdated: registry.lastUpdated,
  });
}

function deserializeRegistry(data: string): MeshRegistry {
  const parsed = JSON.parse(data);
  return {
    modelUrl: parsed.modelUrl,
    meshes: new Map(parsed.meshes),
    meshesByCategory: new Map(parsed.meshesByCategory),
    lastUpdated: parsed.lastUpdated,
  };
}

export class ModelMeshRegistry {
  private registry: MeshRegistry;

  constructor(modelUrl: string) {
    this.registry = {
      modelUrl,
      meshes: new Map(),
      meshesByCategory: new Map(),
      lastUpdated: Date.now(),
    };
  }

  static fromDetections(
    modelUrl: string,
    detections: DetectedMesh[]
  ): ModelMeshRegistry {
    const registry = new ModelMeshRegistry(modelUrl);

    for (const detection of detections) {
      registry.addMesh(detection.name, detection.category);
    }

    return registry;
  }

  static loadFromStorage(modelUrl: string): ModelMeshRegistry | null {
    try {
      const key = getStorageKey(modelUrl);
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const deserialized = deserializeRegistry(data);
      return Object.assign(new ModelMeshRegistry(modelUrl), {
        registry: deserialized,
      });
    } catch {
      return null;
    }
  }

  private addMesh(meshName: string, category: MeshCategory | 'unknown' = 'unknown', userAssigned: boolean = false): void {
    this.registry.meshes.set(meshName, {
      displayName: meshName,
      enabled: true,
      category,
      userAssigned,
    });

    if (!this.registry.meshesByCategory.has(category)) {
      this.registry.meshesByCategory.set(category, []);
    }
    this.registry.meshesByCategory.get(category)!.push(meshName);
  }

  addAllMeshes(meshNames: string[]): void {
    for (const meshName of meshNames) {
      this.addMesh(meshName, 'unknown', false);
    }
  }

  getMeshes(): Map<string, MeshInfo> {
    return new Map(this.registry.meshes);
  }

  getMeshesByCategory(): Map<MeshCategory | 'unknown', string[]> {
    return new Map(this.registry.meshesByCategory);
  }

  getMeshesInCategory(category: MeshCategory | 'unknown'): string[] {
    return this.registry.meshesByCategory.get(category) ?? [];
  }

  setMeshVisibility(meshName: string, enabled: boolean): void {
    const mesh = this.registry.meshes.get(meshName);
    if (mesh) {
      mesh.enabled = enabled;
      this.registry.lastUpdated = Date.now();
    }
  }

  isMeshEnabled(meshName: string): boolean {
    return this.registry.meshes.get(meshName)?.enabled ?? true;
  }

  setCategoryVisibility(category: MeshCategory | 'unknown', enabled: boolean): void {
    const meshNames = this.registry.meshesByCategory.get(category) ?? [];
    for (const meshName of meshNames) {
      this.setMeshVisibility(meshName, enabled);
    }
  }

  setMeshCategory(meshName: string, newCategory: MeshCategory | 'unknown'): void {
    const mesh = this.registry.meshes.get(meshName);
    if (!mesh) return;

    const oldCategory = mesh.category;
    mesh.category = newCategory;
    mesh.userAssigned = true;
    this.registry.lastUpdated = Date.now();

    // Update category mapping
    const oldMeshes = this.registry.meshesByCategory.get(oldCategory) ?? [];
    this.registry.meshesByCategory.set(
      oldCategory,
      oldMeshes.filter(name => name !== meshName)
    );

    if (!this.registry.meshesByCategory.has(newCategory)) {
      this.registry.meshesByCategory.set(newCategory, []);
    }
    this.registry.meshesByCategory.get(newCategory)!.push(meshName);
  }

  resetToDefaults(): void {
    for (const meshInfo of this.registry.meshes.values()) {
      meshInfo.enabled = true;
    }
    this.registry.lastUpdated = Date.now();
  }

  saveToStorage(): void {
    try {
      const key = getStorageKey(this.registry.modelUrl);
      const serialized = serializeRegistry(this.registry);
      localStorage.setItem(key, serialized);
    } catch {
      console.warn('Failed to save mesh registry to localStorage');
    }
  }

  getModelUrl(): string {
    return this.registry.modelUrl;
  }

  getLastUpdated(): number {
    return this.registry.lastUpdated;
  }
}
