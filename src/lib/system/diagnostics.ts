import { Command } from '@tauri-apps/plugin-shell';
import { platform } from '@tauri-apps/plugin-os';

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

// Check if a command exists and get its version
async function checkCommand(
  cmd: string,
  versionArg: string = '--version'
): Promise<{ exists: boolean; version?: string; path?: string }> {
  try {
    const command = Command.create('exec-command', [cmd, versionArg]);
    const output = await command.execute();

    if (output.code === 0) {
      const version = output.stdout.trim().split('\n')[0];
      return { exists: true, version };
    }
    return { exists: false };
  } catch {
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
    // Check if kotex package is installed
    const command = Command.create('exec-command', ['kpsewhich', 'kotex.sty']);
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
  const os = await platform();

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
  const os = await platform();

  try {
    switch (os) {
      case 'windows': {
        // Open TeX Live installer download page
        const command = Command.create('exec-command', [
          'cmd', '/c', 'start', 'https://mirror.ctan.org/systems/texlive/tlnet/install-tl-windows.exe'
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
          const command = Command.create('exec-command', [
            'brew', 'install', '--cask', 'mactex-no-gui'
          ]);
          await command.execute();
          return {
            success: true,
            message: 'Homebrew를 통해 MacTeX 설치를 시작했습니다.',
          };
        } else {
          const command = Command.create('exec-command', [
            'open', 'https://tug.org/mactex/'
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
    const command = Command.create('exec-command', ['tlmgr', 'install', ...packages]);
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
