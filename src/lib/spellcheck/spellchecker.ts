// Simple spell checker for LaTeX documents
// Uses a basic dictionary-based approach with common English words

// Common misspellings and their corrections
const COMMON_MISSPELLINGS: Record<string, string> = {
  'teh': 'the',
  'hte': 'the',
  'adn': 'and',
  'nad': 'and',
  'taht': 'that',
  'waht': 'what',
  'wiht': 'with',
  'whit': 'with',
  'fo': 'of',
  'ot': 'to',
  'ti': 'it',
  'si': 'is',
  'ont': 'not',
  'cna': 'can',
  'jsut': 'just',
  'ahve': 'have',
  'hvae': 'have',
  'knwo': 'know',
  'konw': 'know',
  'tiem': 'time',
  'thier': 'their',
  'theri': 'their',
  'becuase': 'because',
  'beacuse': 'because',
  'recieve': 'receive',
  'occured': 'occurred',
  'occurence': 'occurrence',
  'definately': 'definitely',
  'seperate': 'separate',
  'begining': 'beginning',
  'untill': 'until',
  'accomodate': 'accommodate',
  'accross': 'across',
  'apparant': 'apparent',
  'arguement': 'argument',
  'basicly': 'basically',
  'beleive': 'believe',
  'calender': 'calendar',
  'catagory': 'category',
  'cemetary': 'cemetery',
  'collegue': 'colleague',
  'comming': 'coming',
  'commitee': 'committee',
  'concious': 'conscious',
  'copywrite': 'copyright',
  'dissapear': 'disappear',
  'dissapoint': 'disappoint',
  'embarass': 'embarrass',
  'enviroment': 'environment',
  'existance': 'existence',
  'experiance': 'experience',
  'familar': 'familiar',
  'finaly': 'finally',
  'foriegn': 'foreign',
  'fourty': 'forty',
  'freind': 'friend',
  'goverment': 'government',
  'grammer': 'grammar',
  'gaurd': 'guard',
  'happend': 'happened',
  'harrass': 'harass',
  'hieght': 'height',
  'humourous': 'humorous',
  'immediatly': 'immediately',
  'independant': 'independent',
  'inteligence': 'intelligence',
  'knowlege': 'knowledge',
  'liason': 'liaison',
  'libary': 'library',
  'lisence': 'license',
  'maintainance': 'maintenance',
  'manuever': 'maneuver',
  'medeval': 'medieval',
  'millenium': 'millennium',
  'minature': 'miniature',
  'mischevious': 'mischievous',
  'misspell': 'misspell',
  'neccessary': 'necessary',
  'noticable': 'noticeable',
  'occassion': 'occasion',
  'occurrance': 'occurrence',
  'paralell': 'parallel',
  'parliment': 'parliament',
  'persistant': 'persistent',
  'personel': 'personnel',
  'posession': 'possession',
  'prefered': 'preferred',
  'privelege': 'privilege',
  'professer': 'professor',
  'pronounciation': 'pronunciation',
  'publically': 'publicly',
  'realy': 'really',
  'reccomend': 'recommend',
  'refered': 'referred',
  'relevent': 'relevant',
  'religous': 'religious',
  'repetition': 'repetition',
  'resistence': 'resistance',
  'responsability': 'responsibility',
  'rythm': 'rhythm',
  'saftey': 'safety',
  'secratary': 'secretary',
  'sentance': 'sentence',
  'sieze': 'seize',
  'similer': 'similar',
  'succesful': 'successful',
  'supercede': 'supersede',
  'suprise': 'surprise',
  'tecnique': 'technique',
  'temperture': 'temperature',
  'tommorrow': 'tomorrow',
  'tounge': 'tongue',
  'truely': 'truly',
  'twelth': 'twelfth',
  'tyrany': 'tyranny',
  'underate': 'underrate',
  'usefull': 'useful',
  'vaccum': 'vacuum',
  'vegatable': 'vegetable',
  'wierd': 'weird',
  'wellfare': 'welfare',
  'wether': 'whether',
  'writting': 'writing',
  'yeild': 'yield',
};

// Academic/LaTeX specific corrections
const ACADEMIC_MISSPELLINGS: Record<string, string> = {
  'equasion': 'equation',
  'theorm': 'theorem',
  'theorom': 'theorem',
  'mathmatics': 'mathematics',
  'calculas': 'calculus',
  'algebre': 'algebra',
  'geometery': 'geometry',
  'trigonametry': 'trigonometry',
  'coefficent': 'coefficient',
  'derivitive': 'derivative',
  'intergral': 'integral',
  'matrics': 'matrix',
  'determinat': 'determinant',
  'polynominal': 'polynomial',
  'algorithim': 'algorithm',
  'assymetric': 'asymmetric',
  'hypothisis': 'hypothesis',
  'analyisis': 'analysis',
  'symettric': 'symmetric',
  'orthagonal': 'orthogonal',
  'parrallel': 'parallel',
  'perpindicular': 'perpendicular',
  'statistcs': 'statistics',
  'probabilty': 'probability',
  'varience': 'variance',
  'covarience': 'covariance',
  'correlaton': 'correlation',
  'regrssion': 'regression',
  'convergance': 'convergence',
  'divergance': 'divergence',
};

// Words to ignore (LaTeX commands, technical terms, etc.)
const IGNORE_PATTERNS = [
  /^\\[a-zA-Z]+\*?$/, // LaTeX commands
  /^[0-9]+$/, // Numbers
  /^[a-zA-Z]$/, // Single letters
  /^[A-Z]+$/, // Acronyms
  /^[a-z]+[0-9]+$/, // Variable names like x1, y2
  /^[A-Z][a-z]*[A-Z]/, // CamelCase
];

export interface SpellCheckResult {
  word: string;
  line: number;
  startColumn: number;
  endColumn: number;
  suggestions: string[];
}

// Combine all misspellings
const ALL_MISSPELLINGS = { ...COMMON_MISSPELLINGS, ...ACADEMIC_MISSPELLINGS };

function shouldIgnore(word: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(word));
}

function extractTextFromLatex(content: string): { text: string; line: number; offset: number }[] {
  const results: { text: string; line: number; offset: number }[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Remove LaTeX commands but keep the text
    let processed = line;

    // Remove comments
    const commentIndex = processed.indexOf('%');
    if (commentIndex !== -1) {
      processed = processed.substring(0, commentIndex);
    }

    // Remove math mode content
    processed = processed.replace(/\$\$[^$]*\$\$/g, ' ');
    processed = processed.replace(/\$[^$]*\$/g, ' ');
    processed = processed.replace(/\\\[[^\]]*\\\]/g, ' ');
    processed = processed.replace(/\\\([^)]*\\\)/g, ' ');

    // Remove command arguments we don't want to spell check
    processed = processed.replace(/\\(documentclass|usepackage|begin|end|label|ref|cite|includegraphics)\{[^}]*\}/g, ' ');
    processed = processed.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ');

    // Remove braces
    processed = processed.replace(/[{}[\]]/g, ' ');

    if (processed.trim()) {
      results.push({
        text: processed,
        line: lineIndex + 1,
        offset: 0,
      });
    }
  });

  return results;
}

export function checkSpelling(content: string): SpellCheckResult[] {
  const results: SpellCheckResult[] = [];
  const textSegments = extractTextFromLatex(content);

  textSegments.forEach(({ text, line }) => {
    // Find words in the text segment
    const wordRegex = /\b([a-zA-Z]+)\b/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const lowerWord = word.toLowerCase();

      // Skip if should be ignored
      if (shouldIgnore(word)) continue;

      // Skip short words
      if (word.length < 3) continue;

      // Check for common misspellings
      if (ALL_MISSPELLINGS[lowerWord]) {
        const suggestion = ALL_MISSPELLINGS[lowerWord];
        // Preserve original case
        const correctedSuggestion = word[0] === word[0].toUpperCase()
          ? suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
          : suggestion;

        results.push({
          word,
          line,
          startColumn: match.index + 1,
          endColumn: match.index + word.length + 1,
          suggestions: [correctedSuggestion],
        });
      }
    }
  });

  return results;
}

// Get suggestions for a potentially misspelled word
export function getSuggestions(word: string): string[] {
  const lowerWord = word.toLowerCase();

  // Check direct mapping first
  if (ALL_MISSPELLINGS[lowerWord]) {
    const suggestion = ALL_MISSPELLINGS[lowerWord];
    const correctedSuggestion = word[0] === word[0].toUpperCase()
      ? suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
      : suggestion;
    return [correctedSuggestion];
  }

  // Find similar words using Levenshtein distance
  const suggestions: { word: string; distance: number }[] = [];
  const corrections = Object.values(ALL_MISSPELLINGS);

  corrections.forEach((correctWord) => {
    const distance = levenshteinDistance(lowerWord, correctWord);
    if (distance <= 2) {
      const correctedSuggestion = word[0] === word[0].toUpperCase()
        ? correctWord.charAt(0).toUpperCase() + correctWord.slice(1)
        : correctWord;
      suggestions.push({ word: correctedSuggestion, distance });
    }
  });

  // Sort by distance and return top 5
  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((s) => s.word);
}

// Levenshtein distance for finding similar words
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Add word to ignore list (for session)
const sessionIgnoreList = new Set<string>();

export function addToIgnoreList(word: string): void {
  sessionIgnoreList.add(word.toLowerCase());
}

export function isInIgnoreList(word: string): boolean {
  return sessionIgnoreList.has(word.toLowerCase());
}

export function clearIgnoreList(): void {
  sessionIgnoreList.clear();
}
