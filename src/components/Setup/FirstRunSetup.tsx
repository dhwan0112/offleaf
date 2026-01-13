import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Loader2,
  Check,
  X,
  Package,
  AlertTriangle,
  Download,
  ExternalLink,
  RefreshCw,
  Terminal,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { latexCompiler } from '@/lib/latex/compiler';
import {
  runDiagnostics,
  getInstallInstructions,
  autoInstallTexLive,
  type SystemDiagnostics,
  type DiagnosticResult,
} from '@/lib/system/diagnostics';

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

// Full screen wrapper component - defined outside to prevent recreation on each render
function FullScreenWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-4">
        {children}
      </div>
    </div>
  );
}

interface FirstRunSetupProps {
  onComplete: () => void;
}

export function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [step, setStep] = useState<'diagnose' | 'install-tex' | 'install-packages' | 'done'>('diagnose');
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [diagnosing, setDiagnosing] = useState(true);
  const [essentialPackages, setEssentialPackages] = useState<DetectedPackage[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const runSystemDiagnostics = useCallback(async () => {
    setDiagnosing(true);
    setError(null);

    try {
      if (isTauri()) {
        console.log('Running diagnostics in Tauri environment...');
        const results = await runDiagnostics();
        console.log('Diagnostics results:', results);
        setDiagnostics(results);

        // If TeX is not installed, go to install step
        if (!results.allRequired) {
          setStep('install-tex');
        } else {
          // Check for package manager availability and essential packages
          const hasTlmgr = await invoke<boolean>('check_tlmgr').catch(() => false);

          if (hasTlmgr) {
            const packages = await invoke<DetectedPackage[]>('get_essential_packages').catch(() => []);
            setEssentialPackages(packages);
            const missing = packages.filter((p) => !p.installed).length;
            setMissingCount(missing);

            if (missing > 0) {
              setStep('install-packages');
            } else {
              setStep('done');
            }
          } else {
            setStep('done');
          }
        }
      } else {
        // Web mode - just check basic LaTeX
        console.log('Running diagnostics in Web environment...');
        const installation = await latexCompiler.checkInstallation();
        const hasLatex = installation.xelatex || installation.pdflatex || installation.lualatex;

        if (!hasLatex) {
          setDiagnostics({
            platform: 'web',
            results: [
              { name: 'TeX Live', installed: false, required: true },
            ],
            allRequired: false,
            missingRequired: ['TeX Live'],
          });
          setStep('install-tex');
        } else {
          setStep('done');
        }
      }
    } catch (err) {
      console.error('Diagnostics failed:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      // Still show install-tex step so user can manually install
      setDiagnostics({
        platform: 'unknown',
        results: [
          { name: 'TeX Live', installed: false, required: true },
        ],
        allRequired: false,
        missingRequired: ['TeX Live'],
      });
      setStep('install-tex');
    } finally {
      setDiagnosing(false);
    }
  }, []);

  useEffect(() => {
    runSystemDiagnostics();
  }, [runSystemDiagnostics]);

  const handleAutoInstall = async () => {
    setInstalling(true);
    setError(null);

    try {
      const result = await autoInstallTexLive();
      setInstallProgress((prev) => [...prev, result.message]);

      if (result.success) {
        // Wait a bit and re-run diagnostics
        setTimeout(() => {
          runSystemDiagnostics();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
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
        setInstallProgress((prev) => [...prev, `설치 완료: ${result.installed.join(', ')}`]);
      }
      if (result.failed.length > 0) {
        setInstallProgress((prev) => [...prev, `설치 실패: ${result.failed.join(', ')}`]);
      }

      // Refresh package status
      const packages = await invoke<DetectedPackage[]>('get_essential_packages');
      setEssentialPackages(packages);
      setMissingCount(packages.filter((p) => !p.installed).length);

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

  const renderDiagnosticItem = (result: DiagnosticResult) => (
    <div
      key={result.name}
      className={`flex items-center justify-between p-3 rounded-lg ${
        result.installed
          ? 'bg-green-500/10'
          : result.required
            ? 'bg-red-500/10'
            : 'bg-yellow-500/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {result.installed ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : result.required ? (
          <XCircle className="w-5 h-5 text-red-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        )}
        <div>
          <div className="font-medium">{result.name}</div>
          {result.version && (
            <div className="text-xs text-gray-400">{result.version}</div>
          )}
        </div>
      </div>
      <div className="text-right">
        <span
          className={`text-sm ${
            result.installed
              ? 'text-green-400'
              : result.required
                ? 'text-red-400'
                : 'text-yellow-400'
          }`}
        >
          {result.installed ? '설치됨' : result.required ? '필수' : '권장'}
        </span>
      </div>
    </div>
  );

  // Diagnosing step - full screen loading
  if (step === 'diagnose' && diagnosing) {
    return (
      <FullScreenWrapper>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">시스템 환경 확인 중...</h2>
          <p className="text-gray-400 text-center">
            TeX Live, XeLaTeX, 필수 패키지를 검사합니다
          </p>
          <p className="text-sm text-gray-500 mt-2">
            잠시만 기다려주세요
          </p>
        </div>
      </FullScreenWrapper>
    );
  }

  // Done step
  if (step === 'done') {
    const allGood = diagnostics?.allRequired ?? true;

    return (
      <FullScreenWrapper>
        <div className="bg-[#252526] rounded-lg p-8">
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className={`w-16 h-16 ${allGood ? 'bg-green-500/20' : 'bg-yellow-500/20'} rounded-full flex items-center justify-center`}
            >
              {allGood ? (
                <Check className="w-8 h-8 text-green-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              )}
            </div>
            <h2 className="text-xl font-semibold">
              {allGood ? '설정 완료!' : '설정 완료 (일부 기능 제한)'}
            </h2>
            <p className="text-gray-400 text-center">
              {allGood
                ? 'OffLeaf를 사용할 준비가 되었습니다.'
                : 'TeX Live가 설치되어 있지 않습니다. 일부 기능이 제한됩니다.'}
            </p>
            {!allGood && (
              <p className="text-sm text-gray-500 text-center">
                나중에 설정 → 시스템 진단에서 다시 확인할 수 있습니다.
              </p>
            )}
            <button onClick={onComplete} className="btn btn-primary mt-4">
              시작하기
            </button>
          </div>
        </div>
      </FullScreenWrapper>
    );
  }

  return (
    <FullScreenWrapper>
      <div className="bg-[#252526] rounded-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">OffLeaf 초기 설정</h2>
            <p className="text-sm text-gray-400">
              {step === 'diagnose' && '시스템 환경을 확인하고 있습니다'}
              {step === 'install-tex' && 'TeX Live 설치가 필요합니다'}
              {step === 'install-packages' && '필수 패키지를 설치합니다'}
            </p>
          </div>
        </div>

        {/* Install TeX Step */}
        {step === 'install-tex' && (
          <div className="space-y-4">
            {/* Diagnostic Results */}
            {diagnostics && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">시스템 진단 결과</h3>
                {diagnostics.results.map(renderDiagnosticItem)}
              </div>
            )}

            {/* Missing Required Warning */}
            {diagnostics && diagnostics.missingRequired.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-400">필수 프로그램 미설치</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      다음 프로그램이 설치되어 있지 않습니다:{' '}
                      <strong>{diagnostics.missingRequired.join(', ')}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Install Instructions Toggle */}
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">설치 방법 보기</span>
                </div>
                <span className="text-sm text-blue-400">
                  {showInstructions ? '접기' : '펼치기'}
                </span>
              </button>

              {showInstructions && diagnostics && (
                <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {getInstallInstructions(diagnostics.platform)}
                  </pre>
                </div>
              )}
            </div>

            {/* Auto Install Button */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-400">자동 설치</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    버튼을 클릭하면 TeX Live 설치 페이지를 열거나 자동 설치를 시작합니다.
                  </p>

                  {installProgress.length > 0 && (
                    <div className="mt-3 bg-[#1e1e1e] rounded p-3 max-h-32 overflow-y-auto">
                      {installProgress.map((msg, i) => (
                        <div key={i} className="text-xs text-gray-300 font-mono">
                          {msg}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleAutoInstall}
                    disabled={installing}
                    className="btn btn-primary mt-3"
                  >
                    {installing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        TeX Live 설치하기
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <button
                onClick={runSystemDiagnostics}
                className="btn btn-secondary"
                disabled={diagnosing}
              >
                <RefreshCw className={`w-4 h-4 ${diagnosing ? 'animate-spin' : ''}`} />
                다시 확인
              </button>
              <button onClick={() => setStep('done')} className="btn btn-secondary">
                나중에 설치
              </button>
            </div>
          </div>
        )}

        {/* Install Packages Step */}
        {step === 'install-packages' && (
          <div className="space-y-4">
            {/* Diagnostic Results */}
            {diagnostics && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">시스템 상태</h3>
                {diagnostics.results.map(renderDiagnosticItem)}
              </div>
            )}

            {/* Essential Packages */}
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">필수 LaTeX 패키지</span>
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
                    {pkg.installed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setStep('done')} className="btn btn-secondary" disabled={installing}>
                건너뛰기
              </button>
              {missingCount > 0 && (
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
              {missingCount === 0 && (
                <button onClick={() => setStep('done')} className="btn btn-primary">
                  계속
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenWrapper>
  );
}
