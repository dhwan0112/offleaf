import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  Package,
  Check,
  X,
  Loader2,
  AlertCircle,
  Star,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

interface PackageInfo {
  name: string;
  description: string;
  installed: boolean;
  version: string | null;
  size: string | null;
}

interface PackageSearchResult {
  packages: PackageInfo[];
  total: number;
}

interface InstallResult {
  success: boolean;
  message: string;
  installed_packages: string[];
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke(cmd, args);
  }
  throw new Error('Tauri not available');
}

interface PackageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'search' | 'installed' | 'recommended';

export function PackageManager({ isOpen, onClose }: PackageManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTlmgrAvailable, setIsTlmgrAvailable] = useState<boolean | null>(null);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addToast = useEditorStore((s) => s.addToast);

  // Check if tlmgr is available
  useEffect(() => {
    const checkTlmgr = async () => {
      if (!isTauri()) {
        setIsTlmgrAvailable(false);
        return;
      }

      try {
        const available = await invoke<boolean>('check_tlmgr');
        setIsTlmgrAvailable(available);
      } catch {
        setIsTlmgrAvailable(false);
      }
    };

    if (isOpen) {
      checkTlmgr();
    }
  }, [isOpen]);

  // Load packages based on active tab
  const loadPackages = useCallback(async () => {
    if (!isTauri() || !isTlmgrAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'installed') {
        const result = await invoke<PackageInfo[]>('list_installed_packages');
        setPackages(result);
      } else if (activeTab === 'recommended') {
        const result = await invoke<PackageInfo[]>('get_recommended_packages');
        // Check which recommended packages are installed
        const installedList = await invoke<PackageInfo[]>('list_installed_packages');
        const installedNames = new Set(installedList.map((p) => p.name));
        setPackages(
          result.map((p) => ({
            ...p,
            installed: installedNames.has(p.name),
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isTlmgrAvailable]);

  useEffect(() => {
    if (isOpen && isTlmgrAvailable) {
      loadPackages();
    }
  }, [isOpen, isTlmgrAvailable, loadPackages]);

  // Search packages
  const handleSearch = async () => {
    if (!searchQuery.trim() || !isTauri()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<PackageSearchResult>('search_packages', {
        query: searchQuery,
      });
      setPackages(result.packages);
      setActiveTab('search');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  // Install package
  const handleInstall = async (packageName: string) => {
    if (!isTauri()) return;

    setInstallingPackage(packageName);

    try {
      const result = await invoke<InstallResult>('install_package', {
        packageName,
      });

      if (result.success) {
        addToast('success', `${packageName} 설치 완료`);
        // Update package list
        setPackages((prev) =>
          prev.map((p) => (p.name === packageName ? { ...p, installed: true } : p))
        );
      } else {
        addToast('error', result.message);
      }
    } catch (e) {
      addToast('error', `설치 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInstallingPackage(null);
    }
  };

  // Remove package
  const handleRemove = async (packageName: string) => {
    if (!isTauri()) return;

    setInstallingPackage(packageName);

    try {
      const result = await invoke<InstallResult>('remove_package', {
        packageName,
      });

      if (result.success) {
        addToast('success', `${packageName} 제거 완료`);
        if (activeTab === 'installed') {
          setPackages((prev) => prev.filter((p) => p.name !== packageName));
        } else {
          setPackages((prev) =>
            prev.map((p) => (p.name === packageName ? { ...p, installed: false } : p))
          );
        }
      } else {
        addToast('error', result.message);
      }
    } catch (e) {
      addToast('error', `제거 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInstallingPackage(null);
    }
  };

  // Update all packages
  const handleUpdateAll = async () => {
    if (!isTauri()) return;

    setIsLoading(true);

    try {
      const result = await invoke<InstallResult>('update_packages');
      if (result.success) {
        addToast('success', '모든 패키지 업데이트 완료');
      } else {
        addToast('error', result.message);
      }
    } catch (e) {
      addToast('error', `업데이트 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-[700px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold">패키지 관리자</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not available warning */}
        {!isTauri() && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <span>패키지 관리자는 데스크톱 앱에서만 사용 가능합니다.</span>
            </div>
          </div>
        )}

        {isTauri() && isTlmgrAvailable === false && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">tlmgr를 찾을 수 없습니다</p>
                <p className="text-sm mt-1">
                  TeX Live가 설치되어 있는지 확인하세요. tlmgr는 TeX Live에 포함된 패키지 관리자입니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {isTlmgrAvailable && (
          <>
            {/* Search bar */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="패키지 검색..."
                  className="input w-full pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
              <button onClick={handleSearch} className="btn btn-primary" disabled={isLoading}>
                검색
              </button>
              <button
                onClick={handleUpdateAll}
                className="btn btn-secondary"
                disabled={isLoading}
                title="모든 패키지 업데이트"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[#3c3c3c]">
              <button
                onClick={() => setActiveTab('recommended')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'recommended'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Star className="w-4 h-4 inline mr-1" />
                추천
              </button>
              <button
                onClick={() => setActiveTab('installed')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'installed'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Check className="w-4 h-4 inline mr-1" />
                설치됨
              </button>
              {activeTab === 'search' && (
                <button
                  className="px-4 py-2 text-sm font-medium text-green-400 border-b-2 border-green-400"
                >
                  <Search className="w-4 h-4 inline mr-1" />
                  검색 결과
                </button>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Package list */}
            <div className="flex-1 overflow-auto min-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                </div>
              ) : packages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {activeTab === 'search' ? '검색 결과가 없습니다' : '패키지가 없습니다'}
                </div>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between p-3 bg-[#2d2d2d] rounded-lg hover:bg-[#3c3c3c] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{pkg.name}</span>
                          {pkg.installed && (
                            <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-400 rounded">
                              설치됨
                            </span>
                          )}
                          {pkg.version && (
                            <span className="text-xs text-gray-500">v{pkg.version}</span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-gray-400 truncate mt-1">{pkg.description}</p>
                        )}
                        {pkg.size && <p className="text-xs text-gray-500 mt-1">{pkg.size}</p>}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {pkg.installed ? (
                          <button
                            onClick={() => handleRemove(pkg.name)}
                            disabled={installingPackage === pkg.name}
                            className="btn btn-secondary p-2 text-red-400 hover:bg-red-900/30"
                            title="제거"
                          >
                            {installingPackage === pkg.name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInstall(pkg.name)}
                            disabled={installingPackage === pkg.name}
                            className="btn btn-primary p-2"
                            title="설치"
                          >
                            {installingPackage === pkg.name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="mt-4 pt-4 border-t border-[#3c3c3c] text-xs text-gray-500">
              <p>tlmgr (TeX Live Manager)를 사용하여 패키지를 관리합니다.</p>
              <p className="mt-1">
                일부 패키지는 관리자 권한이 필요할 수 있습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
