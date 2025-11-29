import React, { useMemo, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useMeshVisibility } from '@/features/vrmViewer/meshVisibilityContext';
import { MeshCategory } from '@/features/vrmViewer/meshCategories';

interface MeshToggleModalProps {
  onClose: () => void;
}

const getCategoryLabels = (t: (key: string) => string): Record<MeshCategory | 'unknown', string> => ({
  clothing: t('Clothing'),
  accessories: t('Accessories'),
  footwear: t('Footwear'),
  body: t('Body'),
  unknown: t('Unknown'),
});

const CATEGORIES: (MeshCategory | 'unknown')[] = ['clothing', 'accessories', 'footwear', 'body', 'unknown'];

export const MeshToggleModal: React.FC<MeshToggleModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const { registry, toggleMesh, setMeshCategory, getMeshCategory, isMeshVisible } = useMeshVisibility();

  const allMeshes = useMemo(() => {
    if (!registry) return [];
    return Array.from(registry.getMeshes().entries()).map(([name, info]) => ({
      name,
      category: info.category,
      enabled: info.enabled,
      userAssigned: info.userAssigned,
    }));
  }, [registry]);

  const groupedMeshes = useMemo(() => {
    const groups = new Map<MeshCategory | 'unknown', typeof allMeshes>();
    for (const mesh of allMeshes) {
      if (!groups.has(mesh.category)) {
        groups.set(mesh.category, []);
      }
      groups.get(mesh.category)!.push(mesh);
    }
    return groups;
  }, [allMeshes]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('click', handleClickOutside, { capture: true });
    return () => {
      document.removeEventListener('click', handleClickOutside, { capture: true });
    };
  }, [onClose]);

  const categoryLabels = getCategoryLabels(t);

  if (!registry || allMeshes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 max-w-md border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('Mesh Toggle')}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('No meshes found in this model.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('Mesh Toggle')} ({allMeshes.length} {t('meshes')})
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {CATEGORIES.map((category) => {
            const meshesInCategory = groupedMeshes.get(category) || [];
            if (meshesInCategory.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  {categoryLabels[category]}
                </h3>

                <div className="space-y-2">
                  {meshesInCategory.map((mesh) => (
                    <div key={mesh.name} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                      {/* Visibility toggle */}
                      <input
                        type="checkbox"
                        checked={mesh.enabled}
                        onChange={() => toggleMesh(mesh.name)}
                        className="w-4 h-4 text-blue-500 rounded border-slate-300 dark:border-slate-600"
                      />

                      {/* Mesh name */}
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-mono">
                        {mesh.name}
                      </span>

                      {/* Category selector */}
                      <select
                        value={mesh.category}
                        onChange={(e) =>
                          setMeshCategory(mesh.name, e.target.value as MeshCategory | 'unknown')
                        }
                        className={`text-xs px-3 py-1 rounded border min-w-32 ${
                          mesh.userAssigned
                            ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                            : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryLabels[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
          >
            {t('Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
