// Dynamic imports to avoid issues when Tauri is not available
let Command: typeof import('@tauri-apps/plugin-shell').Command | null = null;
let platformFn: typeof import('@tauri-apps/plugin-os').platform | null = null;
let pluginsInitialized = false;

// Wait for Tauri to be ready
async function waitForTauri(maxRetries = 10, delay = 100): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
}

// Initialize Tauri plugins lazily
async function initPlugins(): Promise<boolean> {
  if (pluginsInitialized) {
    return Command !== null && platformFn !== null;
  }

  // Wait for Tauri to be ready first
  const tauriReady = await waitForTauri();
  if (!tauriReady) {
    console.warn('Tauri not available after waiting');
    pluginsInitialized = true;
    return false;
  }

  if (!Command) {
    try {
      const shell = await import('@tauri-apps/plugin-shell');
      Command = shell.Command;
      console.log('Shell plugin loaded successfully');
    } catch (e) {
      console.warn('Tauri shell plugin not available:', e);
    }
  }
  if (!platformFn) {
    try {
      const os = await import('@tauri-apps/plugin-os');
      platformFn = os.platform;
      console.log('OS plugin loaded successfully');
    } catch (e) {
      console.warn('Tauri OS plugin not available:', e);
    }
  }

  pluginsInitialized = true;
  return Command !== null && platformFn !== null;
}

export interface DiagnosticResult {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  required: boolean;
  installUrl?: string;
  installCommand?: string;
}

export interface SystemDiagnostics {
  platform: string;
  results: DiagnosticResult[];
  allRequired: boolean;
  missingRequired: string[];
}

// Map command to scoped name
function getScopedCommandName(cmd: string): string {
  const cmdMap: Record<string, string> = {
    'xelatex': 'run-xelatex',
    'pdflatex': 'run-pdflatex',
    'lualatex': 'run-lualatex',
    'latex': 'run-latex',
    'tlmgr': 'run-tlmgr',
    'kpsewhich': 'run-kpsewhich',
    'bibtex': 'run-bibtex',
    'biber': 'run-biber',
    'latexmk': 'run-latexmk',
    'brew': 'run-brew',
    'apt-get': 'run-apt',
    'dnf': 'run-dnf',
    'pacman': 'run-pacman',
    'cmd': 'run-cmd',
    'open': 'run-open',
  };
  return cmdMap[cmd] || cmd;
}

// Check if a command exists and get its version
async function checkCommand(
  cmd: string,
  versionArg: string = '--version'
): Promise<{ exists: boolean; version?: string; path?: string }> {
  try {
    const pluginsReady = await initPlugins();
    if (!pluginsReady || !Command) {
      console.warn(`Cannot check command ${cmd}: plugins not ready`);
      return { exists: false };
    }
    const scopedName = getScopedCommandName(cmd);
    console.log(`Checking command: ${cmd} -> ${scopedName}`);
    const command = Command.create(scopedName, [versionArg]);
    const output = await command.execute();
    console.log(`Command ${cmd} result: code=${output.code}`);

    if (output.code === 0) {
      const version = output.stdout.trim().split('\n')[0];
      return { exists: true, version };
    }
    return { exists: false };
  } catch (e) {
    console.error(`Command check failed for ${cmd}:`, e);
    return { exists: false };
  }
}

// Get TeX Live specific info
async function checkTexLive(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    name: 'TeX Live',
    installed: false,
    required: true,
    installUrl: 'https://tug.org/texlive/',
  };

  // Try multiple TeX commands
  const texCommands = ['xelatex', 'pdflatex', 'latex'];

  for (const cmd of texCommands) {
    const check = await checkCommand(cmd, '--version');
    if (check.exists) {
      result.installed = true;
      result.version = check.version;
      break;
    }
  }

  // Try to get tlmgr version for more accurate TeX Live version
  if (result.installed) {
    const tlmgr = await checkCommand('tlmgr', '--version');
    if (tlmgr.exists && tlmgr.version) {
      const match = tlmgr.version.match(/TeX Live (\d+)/);
      if (match) {
        result.version = `TeX Live ${match[1]}`;
      }
    }
  }

  return result;
}

// Check for XeLaTeX specifically (for Korean/CJK support)
async function checkXeLaTeX(): Promise<DiagnosticResult> {
  const check = await checkCommand('xelatex', '--version');

  return {
    name: 'XeLaTeX',
    installed: check.exists,
    version: check.version,
    required: true,
    installUrl: 'https://tug.org/texlive/',
    installCommand: 'tlmgr install xetex',
  };
}

// Check for Korean font packages
async function checkKoreanFonts(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    name: '한글 폰트 패키지',
    installed: false,
    required: false,
    installCommand: 'tlmgr install cjk-ko kotex-utf',
  };

  try {
    await initPlugins();
    if (!Command) {
      return result;
    }
    // Check if kotex package is installed
    const command = Command.create('run-kpsewhich', ['kotex.sty']);
    const output = await command.execute();

    if (output.code === 0 && output.stdout.trim()) {
      result.installed = true;
      result.path = output.stdout.trim();
    }
  } catch {
    // Package not found
  }

  return result;
}

// Check for BibTeX/Biber
async function checkBibTeX(): Promise<DiagnosticResult> {
  const bibtex = await checkCommand('bibtex', '--version');
  const biber = await checkCommand('biber', '--version');

  return {
    name: 'BibTeX/Biber',
    installed: bibtex.exists || biber.exists,
    version: biber.version || bibtex.version,
    required: false,
    installCommand: 'tlmgr install biber biblatex',
  };
}

// Check for latexmk
async function checkLatexmk(): Promise<DiagnosticResult> {
  const check = await checkCommand('latexmk', '--version');

  return {
    name: 'Latexmk',
    installed: check.exists,
    version: check.version,
    required: false,
    installCommand: 'tlmgr install latexmk',
  };
}

// Get platform-specific install instructions
function getInstallInstructions(os: string): string {
  switch (os) {
    case 'windows':
      return `Windows에서 TeX Live 설치:
1. https://tug.org/texlive/ 에서 install-tl-windows.exe 다운로드
2. 설치 프로그램 실행 후 "Install" 클릭
3. 설치 완료 후 시스템 재시작

또는 Chocolatey 사용:
choco install texlive`;

    case 'macos':
      return `macOS에서 TeX Live 설치:
1. https://tug.org/mactex/ 에서 MacTeX 다운로드
2. PKG 파일 실행하여 설치

또는 Homebrew 사용:
brew install --cask mactex`;

    case 'linux':
      return `Linux에서 TeX Live 설치:

Ubuntu/Debian:
sudo apt-get install texlive-full

Fedora:
sudo dnf install texlive-scheme-full

Arch Linux:
sudo pacman -S texlive-most`;

    default:
      return 'https://tug.org/texlive/ 에서 설치 파일을 다운로드하세요.';
  }
}

// Run full system diagnostics
export async function runDiagnostics(): Promise<SystemDiagnostics> {
  await initPlugins();
  const os = platformFn ? await platformFn() : 'unknown';

  const results: DiagnosticResult[] = await Promise.all([
    checkTexLive(),
    checkXeLaTeX(),
    checkKoreanFonts(),
    checkBibTeX(),
    checkLatexmk(),
  ]);

  const missingRequired = results
    .filter((r) => r.required && !r.installed)
    .map((r) => r.name);

  return {
    platform: os,
    results,
    allRequired: missingRequired.length === 0,
    missingRequired,
  };
}

// Get quick check - just check if TeX is available
export async function quickTexCheck(): Promise<boolean> {
  const texLive = await checkTexLive();
  return texLive.installed;
}

// Export install instructions getter
export { getInstallInstructions };

// Auto-install TeX Live (opens installer or runs command)
export async function autoInstallTexLive(): Promise<{ success: boolean; message: string }> {
  await initPlugins();

  if (!platformFn || !Command) {
    return {
      success: false,
      message: 'Tauri 환경에서만 자동 설치가 가능합니다.',
    };
  }

  const os = await platformFn();

  try {
    switch (os) {
      case 'windows': {
        // Open TeX Live installer download page
        const command = Command.create('run-cmd', [
          '/c', 'start', 'https://mirror.ctan.org/systems/texlive/tlnet/install-tl-windows.exe'
        ]);
        await command.execute();
        return {
          success: true,
          message: 'TeX Live 설치 파일 다운로드 페이지를 열었습니다. 다운로드 후 설치를 진행해주세요.',
        };
      }

      case 'macos': {
        // Try homebrew first, then open MacTeX page
        const brewCheck = await checkCommand('brew', '--version');
        if (brewCheck.exists) {
          const command = Command.create('run-brew', [
            'install', '--cask', 'mactex-no-gui'
          ]);
          await command.execute();
          return {
            success: true,
            message: 'Homebrew를 통해 MacTeX 설치를 시작했습니다.',
          };
        } else {
          const command = Command.create('run-open', [
            'https://tug.org/mactex/'
          ]);
          await command.execute();
          return {
            success: true,
            message: 'MacTeX 다운로드 페이지를 열었습니다.',
          };
        }
      }

      case 'linux': {
        // Detect package manager and install
        const apt = await checkCommand('apt-get', '--version');
        const dnf = await checkCommand('dnf', '--version');
        const pacman = await checkCommand('pacman', '--version');

        if (apt.exists) {
          return {
            success: false,
            message: '터미널에서 다음 명령어를 실행하세요:\nsudo apt-get install texlive-full',
          };
        } else if (dnf.exists) {
          return {
            success: false,
            message: '터미널에서 다음 명령어를 실행하세요:\nsudo dnf install texlive-scheme-full',
          };
        } else if (pacman.exists) {
          return {
            success: false,
            message: '터미널에서 다음 명령어를 실행하세요:\nsudo pacman -S texlive-most',
          };
        }

        return {
          success: false,
          message: 'https://tug.org/texlive/ 에서 TeX Live를 설치해주세요.',
        };
      }

      default:
        return {
          success: false,
          message: 'https://tug.org/texlive/ 에서 TeX Live를 설치해주세요.',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `설치 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Install specific TeX packages using tlmgr
export async function installTexPackages(packages: string[]): Promise<{ success: boolean; message: string }> {
  try {
    await initPlugins();
    if (!Command) {
      return {
        success: false,
        message: 'Tauri 환경에서만 패키지 설치가 가능합니다.',
      };
    }
    const command = Command.create('run-tlmgr', ['install', ...packages]);
    const output = await command.execute();

    if (output.code === 0) {
      return {
        success: true,
        message: `패키지 설치 완료: ${packages.join(', ')}`,
      };
    } else {
      return {
        success: false,
        message: `패키지 설치 실패: ${output.stderr}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `패키지 설치 중 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
