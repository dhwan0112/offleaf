import { useState, useEffect } from 'react';
import { Loader2, Check, X, Package, AlertTriangle, Download } from 'lucide-react';
import { latexCompiler } from '@/lib/latex/compiler';

interface DetectedPackage {
  name: string;
  installed: boolean;
  options: string | null;
}

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Tauri invoke helper
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke(cmd, args);
  }
  throw new Error('Tauri not available');
}

interface FirstRunSetupProps {
  onComplete: () => void;
}

export function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [step, setStep] = useState<'check' | 'install' | 'done'>('check');
  const [latexInstalled, setLatexInstalled] = useState(false);
  const [tlmgrAvailable, setTlmgrAvailable] = useState(false);
  const [essentialPackages, setEssentialPackages] = useState<DetectedPackage[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    try {
      // Check LaTeX installation
      const installation = await latexCompiler.checkInstallation();
      const hasLatex = installation.xelatex || installation.pdflatex || installation.lualatex;
      setLatexInstalled(hasLatex);

      if (!hasLatex) {
        setStep('done');
        return;
      }

      // Check tlmgr
      if (isTauri()) {
        const hasTlmgr = await invoke<boolean>('check_tlmgr');
        setTlmgrAvailable(hasTlmgr);

        if (hasTlmgr) {
          // Get essential packages status
          const packages = await invoke<DetectedPackage[]>('get_essential_packages');
          setEssentialPackages(packages);
          const missing = packages.filter(p => !p.installed).length;
          setMissingCount(missing);
        }
      }

      setStep('install');
    } catch (err) {
      console.error('Failed to check environment:', err);
      setStep('done');
    }
  };

  const installEssentialPackages = async () => {
    setInstalling(true);
    setInstallProgress([]);
    setError(null);

    try {
      const result = await invoke<{
        success: boolean;
        installed: string[];
        failed: string[];
        message: string;
      }>('install_essential_packages');

      if (result.installed.length > 0) {
        setInstallProgress(prev => [...prev, `설치 완료: ${result.installed.join(', ')}`]);
      }
      if (result.failed.length > 0) {
        setInstallProgress(prev => [...prev, `설치 실패: ${result.failed.join(', ')}`]);
      }

      // Refresh package status
      const packages = await invoke<DetectedPackage[]>('get_essential_packages');
      setEssentialPackages(packages);
      setMissingCount(packages.filter(p => !p.installed).length);

      if (result.success) {
        setStep('done');
      } else {
        setError(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setInstalling(false);
    }
  };

  const skipSetup = () => {
    setStep('done');
  };

  if (step === 'done') {
    return (
      <div className="modal-overlay">
        <div className="modal-content max-w-lg">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">설정 완료!</h2>
            <p className="text-gray-400 text-center">
              {!latexInstalled
                ? 'LaTeX이 설치되어 있지 않습니다. TeX Live를 설치한 후 패키지 관리자를 사용하세요.'
                : 'OffLeaf를 사용할 준비가 되었습니다.'}
            </p>
            <button onClick={onComplete} className="btn btn-primary mt-4">
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">OffLeaf 초기 설정</h2>
            <p className="text-sm text-gray-400">필수 LaTeX 패키지를 설치합니다</p>
          </div>
        </div>

        {step === 'check' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3">환경 확인 중...</span>
          </div>
        )}

        {step === 'install' && (
          <div className="space-y-4">
            {/* LaTeX Status */}
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                {latexInstalled ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <span className="font-medium">LaTeX 설치</span>
                <span className={`text-sm ${latexInstalled ? 'text-green-400' : 'text-red-400'}`}>
                  {latexInstalled ? '확인됨' : '설치 필요'}
                </span>
              </div>
              {!latexInstalled && (
                <p className="text-sm text-gray-400 ml-8">
                  TeX Live를 먼저 설치해주세요:{' '}
                  <a
                    href="https://www.tug.org/texlive/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    https://www.tug.org/texlive/
                  </a>
                </p>
              )}
            </div>

            {/* tlmgr Status */}
            {latexInstalled && (
              <div className="bg-[#2d2d2d] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {tlmgrAvailable ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <span className="font-medium">패키지 관리자 (tlmgr)</span>
                  <span className={`text-sm ${tlmgrAvailable ? 'text-green-400' : 'text-yellow-400'}`}>
                    {tlmgrAvailable ? '사용 가능' : '사용 불가'}
                  </span>
                </div>
              </div>
            )}

            {/* Essential Packages */}
            {tlmgrAvailable && (
              <div className="bg-[#2d2d2d] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">필수 패키지</span>
                  </div>
                  <span className="text-sm">
                    {missingCount > 0 ? (
                      <span className="text-yellow-400">{missingCount}개 미설치</span>
                    ) : (
                      <span className="text-green-400">모두 설치됨</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4 max-h-40 overflow-y-auto">
                  {essentialPackages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                        pkg.installed
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {pkg.installed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {pkg.name}
                    </div>
                  ))}
                </div>

                {installProgress.length > 0 && (
                  <div className="bg-[#1e1e1e] rounded p-3 mb-4 max-h-32 overflow-y-auto">
                    {installProgress.map((msg, i) => (
                      <div key={i} className="text-xs text-gray-300 font-mono">
                        {msg}
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded mb-4">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={skipSetup} className="btn btn-secondary" disabled={installing}>
                건너뛰기
              </button>
              {tlmgrAvailable && missingCount > 0 && (
                <button
                  onClick={installEssentialPackages}
                  className="btn btn-primary"
                  disabled={installing}
                >
                  {installing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      설치 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      필수 패키지 설치
                    </>
                  )}
                </button>
              )}
              {(!tlmgrAvailable || missingCount === 0) && (
                <button onClick={() => setStep('done')} className="btn btn-primary">
                  계속
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
