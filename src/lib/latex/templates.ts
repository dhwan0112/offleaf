export interface DocumentTemplate {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  category: 'academic' | 'professional' | 'presentation' | 'other';
  content: string;
  thumbnail?: string;
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Document',
    nameKo: '빈 문서',
    description: 'Start with a minimal LaTeX document',
    descriptionKo: '최소한의 LaTeX 문서로 시작',
    category: 'other',
    content: `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath, amssymb}

\\title{제목}
\\author{저자}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{서론}

여기에 내용을 작성하세요.

\\end{document}
`,
  },
  {
    id: 'article-korean',
    name: 'Korean Article',
    nameKo: '한글 논문',
    description: 'Article template with Korean support (XeLaTeX)',
    descriptionKo: 'XeLaTeX 기반 한글 논문 템플릿',
    category: 'academic',
    content: `\\documentclass[12pt, a4paper]{article}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{setspace}

\\geometry{margin=2.5cm}
\\onehalfspacing

\\title{논문 제목}
\\author{저자명\\\\\\small 소속 기관}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
이 문서는 한글 LaTeX 문서 작성을 위한 템플릿입니다.
초록 내용을 여기에 작성합니다.
\\end{abstract}

\\section{서론}

연구의 배경과 목적을 설명합니다.

\\section{본론}

\\subsection{이론적 배경}

관련 이론을 설명합니다.

\\subsection{연구 방법}

연구 방법론을 설명합니다.

\\section{결론}

연구 결과를 요약합니다.

\\begin{thebibliography}{99}
\\bibitem{ref1} 저자, 논문 제목, 학술지명, 연도.
\\end{thebibliography}

\\end{document}
`,
  },
  {
    id: 'thesis',
    name: 'Thesis/Dissertation',
    nameKo: '학위논문',
    description: 'Template for master/doctoral thesis',
    descriptionKo: '석사/박사 학위논문 템플릿',
    category: 'academic',
    content: `\\documentclass[12pt, a4paper, openright]{report}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{setspace}
\\usepackage{fancyhdr}
\\usepackage{titlesec}

\\geometry{
  top=3cm,
  bottom=3cm,
  left=3.5cm,
  right=2.5cm
}
\\onehalfspacing

% 페이지 스타일
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[R]{\\thepage}
\\renewcommand{\\headrulewidth}{0pt}

\\title{
  \\vspace{2cm}
  {\\LARGE 학위논문 제목}\\\\
  \\vspace{1cm}
  {\\large Title in English}
}
\\author{
  \\vspace{2cm}
  저자명\\\\
  \\vspace{1cm}
  \\large 지도교수: 교수명
}
\\date{
  \\vspace{3cm}
  2024년 2월\\\\
  \\vspace{1cm}
  \\large 대학교 대학원\\\\
  학과 전공
}

\\begin{document}

\\maketitle
\\thispagestyle{empty}

\\newpage
\\pagenumbering{roman}

% 초록
\\chapter*{초록}
\\addcontentsline{toc}{chapter}{초록}
논문의 초록을 작성합니다.

% 목차
\\tableofcontents
\\listoffigures
\\listoftables

\\newpage
\\pagenumbering{arabic}

% 본문
\\chapter{서론}

\\section{연구 배경}
연구의 배경을 설명합니다.

\\section{연구 목적}
연구의 목적을 기술합니다.

\\chapter{이론적 배경}

\\section{선행 연구}
관련 선행 연구를 검토합니다.

\\chapter{연구 방법}

\\section{실험 설계}
실험 방법을 설명합니다.

\\chapter{결과 및 논의}

\\section{실험 결과}
실험 결과를 제시합니다.

\\chapter{결론}
연구의 결론을 요약합니다.

% 참고문헌
\\begin{thebibliography}{99}
\\addcontentsline{toc}{chapter}{참고문헌}
\\bibitem{ref1} 저자, 논문 제목, 학술지명, 연도.
\\end{thebibliography}

% 부록
\\appendix
\\chapter{부록}
추가 자료를 첨부합니다.

\\end{document}
`,
  },
  {
    id: 'report',
    name: 'Report',
    nameKo: '보고서',
    description: 'General report template',
    descriptionKo: '일반 보고서 템플릿',
    category: 'professional',
    content: `\\documentclass[12pt, a4paper]{article}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{titlesec}

\\geometry{margin=2.5cm}

% 페이지 스타일
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{보고서 제목}
\\fancyhead[R]{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\title{\\textbf{보고서 제목}}
\\author{작성자: 홍길동\\\\소속: 부서명}
\\date{작성일: \\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

\\section{개요}

보고서의 목적과 범위를 설명합니다.

\\section{현황 분석}

\\subsection{현재 상황}
현재 상황을 분석합니다.

\\subsection{문제점}
발견된 문제점을 기술합니다.

\\section{제안 사항}

\\subsection{해결 방안}
문제 해결을 위한 방안을 제시합니다.

\\subsection{기대 효과}
제안 사항의 기대 효과를 설명합니다.

\\section{결론}

보고서의 결론을 요약합니다.

\\section{첨부 자료}

추가 자료가 있다면 첨부합니다.

\\end{document}
`,
  },
  {
    id: 'resume',
    name: 'Resume/CV',
    nameKo: '이력서',
    description: 'Professional resume template',
    descriptionKo: '전문 이력서 템플릿',
    category: 'professional',
    content: `\\documentclass[11pt, a4paper]{article}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\geometry{margin=1.5cm}
\\pagestyle{empty}

% 색상 정의
\\definecolor{primary}{RGB}{0, 90, 160}

% 섹션 스타일
\\titleformat{\\section}{\\Large\\bfseries\\color{primary}}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}

\\begin{document}

% 헤더
\\begin{center}
  {\\LARGE\\bfseries 홍길동}\\\\[6pt]
  {\\large 소프트웨어 엔지니어}\\\\[12pt]
  \\begin{tabular}{c c c}
    \\href{mailto:email@example.com}{email@example.com} &
    010-1234-5678 &
    서울특별시 강남구
  \\end{tabular}
\\end{center}

\\section{학력}

\\textbf{서울대학교} \\hfill 2018 -- 2022\\\\
컴퓨터공학과 학사

\\section{경력}

\\textbf{ABC 테크놀로지} \\hfill 2022 -- 현재\\\\
\\textit{소프트웨어 엔지니어}
\\begin{itemize}[leftmargin=*, nosep]
  \\item 웹 애플리케이션 개발 및 유지보수
  \\item 마이크로서비스 아키텍처 설계 및 구현
  \\item 팀 리드로서 주니어 개발자 멘토링
\\end{itemize}

\\textbf{XYZ 소프트웨어} \\hfill 2021 -- 2022\\\\
\\textit{인턴 개발자}
\\begin{itemize}[leftmargin=*, nosep]
  \\item 모바일 앱 개발 보조
  \\item API 문서 작성 및 테스트
\\end{itemize}

\\section{기술}

\\textbf{프로그래밍 언어:} Python, JavaScript, TypeScript, Java\\\\
\\textbf{프레임워크:} React, Node.js, Spring Boot\\\\
\\textbf{도구:} Git, Docker, Kubernetes, AWS

\\section{프로젝트}

\\textbf{오픈소스 프로젝트} \\hfill 2023\\\\
프로젝트 설명 및 기여 내용을 작성합니다.

\\section{자격증}

\\textbf{정보처리기사} \\hfill 2021\\\\
한국산업인력공단

\\end{document}
`,
  },
  {
    id: 'beamer',
    name: 'Presentation (Beamer)',
    nameKo: '프레젠테이션',
    description: 'Beamer presentation template',
    descriptionKo: 'Beamer 기반 프레젠테이션 템플릿',
    category: 'presentation',
    content: `\\documentclass[aspectratio=169]{beamer}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{amsmath, amssymb}
\\usepackage{graphicx}

% 테마 설정
\\usetheme{Madrid}
\\usecolortheme{default}

% 메타 정보
\\title{발표 제목}
\\subtitle{부제목}
\\author{발표자 이름}
\\institute{소속 기관}
\\date{\\today}

\\begin{document}

% 타이틀 슬라이드
\\begin{frame}
  \\titlepage
\\end{frame}

% 목차
\\begin{frame}{목차}
  \\tableofcontents
\\end{frame}

\\section{서론}

\\begin{frame}{서론}
  \\begin{itemize}
    \\item 첫 번째 포인트
    \\item 두 번째 포인트
    \\item 세 번째 포인트
  \\end{itemize}
\\end{frame}

\\section{본론}

\\begin{frame}{본론 - 첫 번째 주제}
  \\begin{block}{중요 개념}
    중요한 내용을 블록으로 강조합니다.
  \\end{block}

  \\begin{alertblock}{주의}
    주의가 필요한 내용입니다.
  \\end{alertblock}
\\end{frame}

\\begin{frame}{수식 예시}
  \\begin{equation}
    E = mc^2
  \\end{equation}

  \\begin{align}
    a^2 + b^2 &= c^2\\\\
    \\int_0^\\infty e^{-x^2} dx &= \\frac{\\sqrt{\\pi}}{2}
  \\end{align}
\\end{frame}

\\section{결론}

\\begin{frame}{결론}
  \\begin{enumerate}
    \\item 첫 번째 결론
    \\item 두 번째 결론
    \\item 세 번째 결론
  \\end{enumerate}
\\end{frame}

\\begin{frame}
  \\centering
  \\Huge 감사합니다\\\\
  \\vspace{1cm}
  \\large 질문 있으신가요?
\\end{frame}

\\end{document}
`,
  },
  {
    id: 'letter',
    name: 'Letter',
    nameKo: '편지/서신',
    description: 'Formal letter template',
    descriptionKo: '공식 서신 템플릿',
    category: 'professional',
    content: `\\documentclass[12pt, a4paper]{letter}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{geometry}

\\geometry{margin=2.5cm}

\\signature{홍길동\\\\직위\\\\연락처}
\\address{보내는 사람 주소\\\\서울특별시 강남구\\\\우편번호 12345}

\\begin{document}

\\begin{letter}{받는 사람 이름\\\\받는 사람 직위\\\\받는 사람 주소\\\\도시, 우편번호}

\\opening{존경하는 OOO님께,}

편지의 본문을 작성합니다. 첫 번째 단락에서는 편지의 목적을 명확히 밝힙니다.

두 번째 단락에서는 세부 내용을 설명합니다. 필요한 경우 여러 단락으로 나누어 작성할 수 있습니다.

세 번째 단락에서는 요청 사항이나 다음 단계에 대해 언급합니다.

\\closing{감사합니다.}

\\ps{추신: 추가로 전달할 내용이 있다면 여기에 작성합니다.}

\\encl{첨부 문서 목록}

\\end{letter}

\\end{document}
`,
  },
  {
    id: 'homework',
    name: 'Homework/Assignment',
    nameKo: '과제/숙제',
    description: 'Template for homework assignments',
    descriptionKo: '과제 제출용 템플릿',
    category: 'academic',
    content: `\\documentclass[12pt, a4paper]{article}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{enumitem}

\\geometry{margin=2.5cm}

% 페이지 헤더
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{과목명}
\\chead{과제 제목}
\\rhead{제출일: \\today}
\\cfoot{\\thepage}

% 문제 환경
\\newcounter{problem}
\\newenvironment{problem}[1][]{%
  \\refstepcounter{problem}%
  \\par\\medskip\\noindent
  \\textbf{문제 \\theproblem#1.}\\itshape
}{\\par\\medskip}

\\newenvironment{solution}{%
  \\par\\noindent
  \\textbf{풀이:}\\normalfont
}{\\par\\medskip}

\\begin{document}

\\begin{center}
  {\\Large\\textbf{과제 제목}}\\\\[6pt]
  학번: 2024-00000 \\quad 이름: 홍길동
\\end{center}

\\begin{problem}
첫 번째 문제를 작성합니다.
\\end{problem}

\\begin{solution}
첫 번째 문제의 풀이를 작성합니다.

수식이 필요한 경우:
\\begin{equation}
  f(x) = \\int_0^x t^2 \\, dt = \\frac{x^3}{3}
\\end{equation}
\\end{solution}

\\begin{problem}
두 번째 문제를 작성합니다.
\\end{problem}

\\begin{solution}
두 번째 문제의 풀이를 작성합니다.
\\begin{enumerate}[label=(\\alph*)]
  \\item 첫 번째 소문항
  \\item 두 번째 소문항
\\end{enumerate}
\\end{solution}

\\begin{problem}
세 번째 문제를 작성합니다.
\\end{problem}

\\begin{solution}
세 번째 문제의 풀이를 작성합니다.
\\end{solution}

\\end{document}
`,
  },
  {
    id: 'math-notes',
    name: 'Math Notes',
    nameKo: '수학 노트',
    description: 'Template for mathematical notes with theorems',
    descriptionKo: '정리/증명이 포함된 수학 노트 템플릿',
    category: 'academic',
    content: `\\documentclass[12pt, a4paper]{article}
\\usepackage{fontspec}
\\usepackage{kotex}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{mathtools}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=2.5cm}

% 정리 환경 정의
\\theoremstyle{plain}
\\newtheorem{theorem}{정리}[section]
\\newtheorem{lemma}[theorem]{보조정리}
\\newtheorem{corollary}[theorem]{따름정리}
\\newtheorem{proposition}[theorem]{명제}

\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{정의}
\\newtheorem{example}[theorem]{예제}

\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{참고}

\\title{수학 노트}
\\author{작성자}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

\\section{기본 개념}

\\begin{definition}[집합]
집합(set)은 명확한 기준에 의해 그 대상을 분명히 알 수 있는 것들의 모임이다.
\\end{definition}

\\begin{example}
$\\mathbb{N} = \\{1, 2, 3, \\ldots\\}$는 자연수의 집합이다.
\\end{example}

\\section{주요 정리}

\\begin{theorem}[피타고라스 정리]
직각삼각형에서 빗변의 제곱은 나머지 두 변의 제곱의 합과 같다.
\\begin{equation}
  a^2 + b^2 = c^2
\\end{equation}
\\end{theorem}

\\begin{proof}
증명 내용을 작성합니다.
\\end{proof}

\\begin{lemma}
보조정리 내용을 작성합니다.
\\end{lemma}

\\begin{corollary}
따름정리 내용을 작성합니다.
\\end{corollary}

\\section{주요 공식}

\\subsection{미적분}

\\begin{align}
  \\frac{d}{dx} x^n &= nx^{n-1}\\\\
  \\int x^n \\, dx &= \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)\\\\
  \\int_a^b f(x) \\, dx &= F(b) - F(a)
\\end{align}

\\subsection{선형대수}

행렬 $A$의 행렬식:
\\begin{equation}
  \\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc
\\end{equation}

\\begin{remark}
추가적인 참고 사항을 작성합니다.
\\end{remark}

\\end{document}
`,
  },
];

export function getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
  return documentTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return documentTemplates.find((t) => t.id === id);
}
