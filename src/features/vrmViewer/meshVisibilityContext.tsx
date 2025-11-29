import React, { createContext, useContext, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ModelMeshRegistry } from './modelMeshRegistry';
import { MeshCategory } from './meshCategories';
import { Viewer } from './viewer';
import { ViewerContext } from './viewerContext';

export interface MeshVisibilityContextType {
  registry: ModelMeshRegistry | null;
  toggleMesh: (meshName: string) => void;
  toggleCategory: (category: MeshCategory | 'unknown') => void;
  resetToDefaults: () => void;
  isMeshVisible: (meshName: string) => boolean;
  getCurrentModelUrl: () => string | null;
  setRegistryFromViewer: (modelUrl: string) => void;
  setMeshCategory: (meshName: string, category: MeshCategory | 'unknown') => void;
  getMeshCategory: (meshName: string) => MeshCategory | 'unknown' | null;
}

const MeshVisibilityContext = createContext<MeshVisibilityContextType | undefined>(undefined);

interface MeshVisibilityProviderProps {
  children: React.ReactNode;
}

export const MeshVisibilityProvider: React.FC<MeshVisibilityProviderProps> = ({
  children,
}) => {
  const { viewer } = useContext(ViewerContext) ?? { viewer: null };
  const [registry, setRegistry] = useState<ModelMeshRegistry | null>(null);

  const updateViewerMeshVisibility = useCallback(
    (meshName: string, visible: boolean) => {
      if (!viewer) return;
      viewer.setMeshVisibility(meshName, visible);
    },
    [viewer]
  );

  const toggleMesh = useCallback(
    (meshName: string) => {
      if (!registry) return;

      const isCurrentlyVisible = registry.isMeshEnabled(meshName);
      registry.setMeshVisibility(meshName, !isCurrentlyVisible);
      registry.saveToStorage();

      updateViewerMeshVisibility(meshName, !isCurrentlyVisible);
      // Create a fresh copy of the registry to trigger re-renders
      const freshRegistry = ModelMeshRegistry.loadFromStorage(registry.getModelUrl());
      if (freshRegistry) {
        setRegistry(freshRegistry);
      }
    },
    [registry, updateViewerMeshVisibility]
  );

  const toggleCategory = useCallback(
    (category: MeshCategory | 'unknown') => {
      if (!registry) return;

      const meshesInCategory = registry.getMeshesInCategory(category);
      const allEnabled = meshesInCategory.every((name) => registry.isMeshEnabled(name));

      registry.setCategoryVisibility(category, !allEnabled);
      registry.saveToStorage();

      meshesInCategory.forEach((meshName) => {
        updateViewerMeshVisibility(meshName, !allEnabled);
      });

      // Create a fresh copy of the registry to trigger re-renders
      const freshRegistry = ModelMeshRegistry.loadFromStorage(registry.getModelUrl());
      if (freshRegistry) {
        setRegistry(freshRegistry);
      }
    },
    [registry, updateViewerMeshVisibility]
  );

  const resetToDefaults = useCallback(() => {
    if (!registry) return;

    registry.resetToDefaults();
    registry.saveToStorage();

    registry.getMeshes().forEach((_, meshName) => {
      updateViewerMeshVisibility(meshName, true);
    });

    // Create a fresh copy of the registry to trigger re-renders
    const freshRegistry = ModelMeshRegistry.loadFromStorage(registry.getModelUrl());
    if (freshRegistry) {
      setRegistry(freshRegistry);
    }
  }, [registry, updateViewerMeshVisibility]);

  const isMeshVisible = useCallback(
    (meshName: string): boolean => {
      return registry?.isMeshEnabled(meshName) ?? true;
    },
    [registry]
  );

  const getCurrentModelUrl = useCallback((): string | null => {
    return registry?.getModelUrl() ?? null;
  }, [registry]);

  const setRegistryFromViewer = useCallback(
    (modelUrl: string) => {
      // If the model URL changed, clear the old registry
      if (registry && registry.getModelUrl() !== modelUrl) {
        setRegistry(null);
      }

      if (!viewer || !viewer.model) {
        setRegistry(null);
        return;
      }

      try {
        // Load the registry for the current model
        let newRegistry = ModelMeshRegistry.loadFromStorage(modelUrl);

        if (!newRegistry) {
          const detections = viewer.model.detectRemovableMeshes();

          // Create registry with auto-detected categories
          newRegistry = ModelMeshRegistry.fromDetections(modelUrl, detections);

          // Get ALL mesh names and add undetected ones as 'unknown'
          const allMeshNames: string[] = [];
          if (viewer.model.vrm && viewer.model.vrm.scene) {
            viewer.model.vrm.scene.traverse((obj: THREE.Object3D) => {
              if (obj instanceof THREE.Mesh) {
                allMeshNames.push(obj.name);
              }
            });

            const detectedNames = new Set(detections.map(d => d.name));
            const undetectedMeshes = allMeshNames.filter(name => !detectedNames.has(name));

            if (undetectedMeshes.length > 0) {
              newRegistry.addAllMeshes(undetectedMeshes);
            }
          }

          newRegistry.saveToStorage();
        }

        if (newRegistry && newRegistry.getMeshes().size > 0) {
          applyRegistryVisibility(viewer, newRegistry);
          setRegistry(newRegistry);
        } else {
          setRegistry(newRegistry);
        }
      } catch (error) {
        console.error('Error setting mesh registry from viewer:', error);
        setRegistry(null);
      }
    },
    [viewer]
  );

  const setMeshCategory = useCallback(
    (meshName: string, category: MeshCategory | 'unknown') => {
      if (!registry) return;
      registry.setMeshCategory(meshName, category);
      registry.saveToStorage();
      // Create a fresh copy of the registry to trigger re-renders
      const freshRegistry = ModelMeshRegistry.loadFromStorage(registry.getModelUrl());
      if (freshRegistry) {
        setRegistry(freshRegistry);
      }
    },
    [registry]
  );

  const getMeshCategory = useCallback(
    (meshName: string): MeshCategory | 'unknown' | null => {
      return registry?.getMeshes().get(meshName)?.category ?? null;
    },
    [registry]
  );

  const value: MeshVisibilityContextType = {
    registry,
    toggleMesh,
    toggleCategory,
    resetToDefaults,
    isMeshVisible,
    getCurrentModelUrl,
    setRegistryFromViewer,
    setMeshCategory,
    getMeshCategory,
  };

  return (
    <MeshVisibilityContext.Provider value={value}>
      {children}
    </MeshVisibilityContext.Provider>
  );
};

export const useMeshVisibility = (): MeshVisibilityContextType => {
  const context = useContext(MeshVisibilityContext);
  if (!context) {
    throw new Error('useMeshVisibility must be used within MeshVisibilityProvider');
  }
  return context;
};

const applyRegistryVisibility = (viewer: Viewer, registry: ModelMeshRegistry): void => {
  const meshes = registry.getMeshes();

  viewer.traverseScene((obj: THREE.Object3D) => {
    if (obj instanceof THREE.Mesh) {
      if (meshes.has(obj.name)) {
        const meshInfo = meshes.get(obj.name);
        obj.visible = meshInfo?.enabled ?? true;
      }
    }
  });
};
