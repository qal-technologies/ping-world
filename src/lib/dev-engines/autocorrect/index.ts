// ============================================================
// AutoCorrect Engine — Industry-standard typo correction
// Soundex phonetic matching + Levenshtein edit distance
// Comprehensive English dictionary (verbs, nouns, adjectives)
// ============================================================

export interface AutoCorrectConfig {
  sensitivity?: 'low' | 'medium' | 'high';
  language?: string;
  customDictionary?: string[];
  maxSuggestions?: number;
  autoCapitalize?: boolean;
}

export interface AutoCorrectToken {
  word: string;
  suggestion: string;
  index: number;
  confidence: number; // 0.0 – 1.0
  reason:
    | 'direct_match'
    | 'phonetic'
    | 'levenshtein'
    | 'capitalization'
    | 'common_typo';
}

export interface AutoCorrectResult {
  originalText: string;
  correctedText: string;
  corrections: AutoCorrectToken[];
  suggestions: string[];
  stats: {
    totalWords: number;
    correctedCount: number;
    accuracy: number;
  };
}

// ---- Comprehensive misspelling → correction map ----
const MISSPELLING_MAP: Record<string, string> = {
  // Common transpositions
  teh: 'the',
  taht: 'that',
  thsi: 'this',
  adn: 'and',
  nad: 'and',
  hte: 'the',
  ti: 'it',
  fo: 'of',
  ot: 'to',
  si: 'is',
  // Vowel errors
  recieve: 'receive',
  beleive: 'believe',
  releive: 'relieve',
  freind: 'friend',
  wierd: 'weird',
  cheif: 'chief',
  peice: 'piece',
  acheive: 'achieve',
  acchieve: 'achieve',
  percieve: 'perceive',
  // Double-letter errors
  untill: 'until',
  fullfil: 'fulfill',
  occured: 'occurred',
  writting: 'writing',
  runing: 'running',
  prefered: 'preferred',
  refered: 'referred',
  occurance: 'occurrence',
  // -ance / -ence
  existance: 'existence',
  differance: 'difference',
  independance: 'independence',
  correspondance: 'correspondence',
  importence: 'importance',
  relevence: 'relevance',
  referance: 'reference',
  // -tion
  seperation: 'separation',
  administation: 'administration',
  accomodation: 'accommodation',
  pronouciation: 'pronunciation',
  // Common words
  seperate: 'separate',
  definately: 'definitely',
  definatley: 'definitely',
  accomodate: 'accommodate',
  accross: 'across',
  apparant: 'apparent',
  arguement: 'argument',
  basicly: 'basically',
  beacuse: 'because',
  calender: 'calendar',
  camoflage: 'camouflage',
  catagory: 'category',
  collegue: 'colleague',
  comming: 'coming',
  committment: 'commitment',
  concious: 'conscious',
  curiousity: 'curiosity',
  copywrite: 'copyright',
  dilemna: 'dilemma',
  dissapear: 'disappear',
  dissapoint: 'disappoint',
  embarass: 'embarrass',
  enviroment: 'environment',
  excercise: 'exercise',
  familier: 'familiar',
  fianlly: 'finally',
  foriegn: 'foreign',
  fourty: 'forty',
  goverment: 'government',
  grammer: 'grammar',
  guidence: 'guidance',
  happend: 'happened',
  harrass: 'harass',
  heigth: 'height',
  humerous: 'humorous',
  imediate: 'immediate',
  incidently: 'incidentally',
  independant: 'independent',
  indispensible: 'indispensable',
  innoculate: 'inoculate',
  intergrate: 'integrate',
  intimite: 'intimate',
  irresistable: 'irresistible',
  knowlegde: 'knowledge',
  liberary: 'library',
  lisence: 'license',
  maintainance: 'maintenance',
  medival: 'medieval',
  millenium: 'millennium',
  miniscule: 'minuscule',
  mischevious: 'mischievous',
  misspell: 'misspell',
  neccessary: 'necessary',
  nieghbor: 'neighbor',
  noticable: 'noticeable',
  ocassion: 'occasion',
  omision: 'omission',
  oppertunity: 'opportunity',
  reccommend: 'recommend',
  persistant: 'persistent',
  pharoah: 'pharaoh',
  plagarize: 'plagiarize',
  posession: 'possession',
  preceed: 'precede',
  prejudice: 'prejudice',
  priviledge: 'privilege',
  probaly: 'probably',
  proffessional: 'professional',
  pronounciation: 'pronunciation',
  publically: 'publicly',
  questionaire: 'questionnaire',
  realise: 'realize',
  recomend: 'recommend',
  resistence: 'resistance',
  resturant: 'restaurant',
  rythm: 'rhythm',
  sacrilegious: 'sacrilegious',
  sandwitch: 'sandwich',
  scedule: 'schedule',
  sence: 'sense',
  siezure: 'seizure',
  sieze: 'seize',
  similer: 'similar',
  sincerly: 'sincerely',
  speach: 'speech',
  succesful: 'successful',
  supercede: 'supersede',
  suprised: 'surprised',
  temperture: 'temperature',
  tendancy: 'tendency',
  tommorow: 'tomorrow',
  tounge: 'tongue',
  truely: 'truly',
  uncommited: 'uncommitted',
  underate: 'underrate',
  usualy: 'usually',
  vaccum: 'vacuum',
  visious: 'vicious',
  wether: 'whether',
  wich: 'which',
  devloper: 'developer',
  funciton: 'function',
  sysem: 'system',
  scracth: 'scratch',
  impolemented: 'implemented',
  parrmaters: 'parameters',
  customixation: 'customization',
  nethids: 'methods',
  prtopely: 'properly',
  nmeant: 'meant',
  thhta: 'that',
  actuall: 'actual',
  depedning: 'depending',
  parramaters: 'parameters',
  codeing: 'coding',
  algoritm: 'algorithm',
  exampel: 'example',
  performace: 'performance',
  usefull: 'useful',
  succefully: 'successfully',
  persond: 'person',
  prodctivity: 'productivity',
  visualizer: 'visualizer',
  documetation: 'documentation',
  authintication: 'authentication',
  autorization: 'authorization',
  intrgration: 'integration',
  databse: 'database',
  asyncronous: 'asynchronous',
  asyncronus: 'asynchronous',
  javascrip: 'javascript',
  typescritp: 'typescript',
  reactjs: 'reactjs',
  framwork: 'framework',
  repositery: 'repository',
  brach: 'branch',
  comit: 'commit',
  pul: 'pull',
  depandency: 'dependency',
  configration: 'configuration',
  progrm: 'program',
  progrmming: 'programming',
  varieble: 'variable',
  constatn: 'constant',
  interfece: 'interface',
  compoennt: 'component',
  renderig: 'rendering',
  proprty: 'property',
  valure: 'value',
  instace: 'instance',
  inheratance: 'inheritance',
  polymorpism: 'polymorphism',
  encapsolation: 'encapsulation',
  abstraction: 'abstraction',
  // More common English
  thier: 'their',
  whith: 'with',
  wuold: 'would',
  shoudl: 'should',
  coudl: 'could',
  doesnt: "doesn't",
  isnt: "isn't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  wasnt: "wasn't",
  werent: "weren't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
  wouldnt: "wouldn't",
  shouldnt: "shouldn't",
  couldnt: "couldn't",
  maynt: "mayn't",
  // Homophones and commonly confused
  affect: 'affect',
  effect: 'effect',
  their: 'their',
  there: 'there',
  its: 'its',
  alot: 'a lot',
  aswell: 'as well',
  thankyou: 'thank you',
  everyday: 'everyday',
  noone: 'no one',
  alright: 'alright',
  // Plural/verb forms
  chidlren: 'children',
  libaries: 'libraries',
  categoires: 'categories',
  exmaples: 'examples',
  resposnes: 'responses',
  questoins: 'questions',
};

// ---- Large valid English word set ----
const ENGLISH_CORPUS = new Set([
  // Articles / conjunctions / prepositions
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'nor',
  'for',
  'so',
  'yet',
  'while',
  'although',
  'because',
  'since',
  'unless',
  'until',
  'if',
  'when',
  'where',
  'that',
  'which',
  'who',
  'whom',
  'whose',
  'in',
  'on',
  'at',
  'by',
  'with',
  'about',
  'above',
  'below',
  'under',
  'over',
  'through',
  'between',
  'among',
  'from',
  'to',
  'of',
  'off',
  'out',
  'into',
  'onto',
  'upon',
  'within',
  'without',
  'against',
  'along',
  'across',
  'after',
  'before',
  'during',
  'behind',
  'beyond',
  // Pronouns
  'i',
  'me',
  'my',
  'mine',
  'myself',
  'we',
  'us',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'this',
  'that',
  'these',
  'those',
  'what',
  'who',
  'whom',
  'which',
  // Common verbs (base + inflections)
  'be',
  'is',
  'was',
  'are',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'done',
  'doing',
  'say',
  'said',
  'says',
  'go',
  'went',
  'gone',
  'get',
  'got',
  'gotten',
  'make',
  'made',
  'makes',
  'know',
  'knew',
  'known',
  'think',
  'thought',
  'take',
  'took',
  'taken',
  'see',
  'saw',
  'seen',
  'come',
  'came',
  'come',
  'want',
  'wanted',
  'use',
  'used',
  'find',
  'found',
  'give',
  'gave',
  'given',
  'tell',
  'told',
  'work',
  'worked',
  'call',
  'called',
  'try',
  'tried',
  'ask',
  'asked',
  'need',
  'needed',
  'feel',
  'felt',
  'become',
  'became',
  'leave',
  'left',
  'put',
  'keep',
  'kept',
  'let',
  'begin',
  'began',
  'begun',
  'show',
  'showed',
  'shown',
  'hear',
  'heard',
  'play',
  'run',
  'ran',
  'move',
  'live',
  'believe',
  'hold',
  'bring',
  'happen',
  'write',
  'wrote',
  'written',
  'provide',
  'sit',
  'sat',
  'stand',
  'stood',
  'lose',
  'lost',
  'pay',
  'paid',
  'meet',
  'met',
  'include',
  'continue',
  'set',
  'learn',
  'learned',
  'change',
  'changed',
  'lead',
  'led',
  'understand',
  'understood',
  'watch',
  'follow',
  'stop',
  'create',
  'speak',
  'spoke',
  'spoken',
  'read',
  'spend',
  'spent',
  'grow',
  'grew',
  'grown',
  'open',
  'walk',
  'win',
  'won',
  'offer',
  'remember',
  'love',
  'consider',
  'appear',
  'buy',
  'bought',
  'wait',
  'serve',
  'die',
  'send',
  'sent',
  'expect',
  'build',
  'built',
  'stay',
  'fall',
  'fell',
  'fallen',
  'reach',
  'kill',
  'remain',
  'suggest',
  'raise',
  'pass',
  'sell',
  'sold',
  'require',
  'report',
  'decide',
  'pull',
  'break',
  'broke',
  'broken',
  'start',
  'return',
  'help',
  'control',
  'add',
  'focus',
  'order',
  'start',
  // Common nouns
  'time',
  'year',
  'people',
  'way',
  'day',
  'man',
  'woman',
  'child',
  'world',
  'life',
  'hand',
  'part',
  'place',
  'case',
  'week',
  'company',
  'system',
  'program',
  'question',
  'work',
  'government',
  'number',
  'night',
  'point',
  'home',
  'water',
  'room',
  'mother',
  'area',
  'money',
  'story',
  'fact',
  'month',
  'lot',
  'right',
  'study',
  'book',
  'eye',
  'job',
  'word',
  'business',
  'issue',
  'side',
  'kind',
  'head',
  'house',
  'service',
  'friend',
  'father',
  'power',
  'hour',
  'game',
  'line',
  'end',
  'among',
  'order',
  'name',
  'school',
  'country',
  'water',
  'music',
  'game',
  'food',
  'health',
  'body',
  'family',
  'car',
  'form',
  'data',
  'class',
  'type',
  'list',
  'item',
  'user',
  'team',
  'code',
  'page',
  'error',
  'file',
  'table',
  'view',
  'mode',
  'step',
  'plan',
  'group',
  'role',
  'test',
  'key',
  'value',
  'name',
  'text',
  'link',
  'icon',
  'card',
  'form',
  'note',
  'task',
  'date',
  'rate',
  'size',
  'site',
  'post',
  'user',
  'name',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'zip',
  'region',
  'language',
  'version',
  'update',
  'server',
  'client',
  'request',
  'response',
  'status',
  'token',
  'session',
  'cache',
  'query',
  'route',
  'model',
  'schema',
  'record',
  'index',
  'field',
  'column',
  'row',
  'table',
  'view',
  'form',
  'input',
  'output',
  'result',
  'action',
  // Common adjectives
  'good',
  'new',
  'first',
  'last',
  'long',
  'great',
  'little',
  'own',
  'right',
  'big',
  'high',
  'small',
  'large',
  'next',
  'early',
  'young',
  'important',
  'public',
  'private',
  'real',
  'different',
  'best',
  'free',
  'same',
  'local',
  'required',
  'optional',
  'main',
  'entire',
  'open',
  'old',
  'full',
  'sure',
  'true',
  'false',
  'null',
  'undefined',
  'valid',
  'invalid',
  'active',
  'inactive',
  'visible',
  'hidden',
  'enabled',
  'disabled',
  'success',
  'error',
  'warning',
  'info',
  'complete',
  'incomplete',
  'pending',
  'done',
  'current',
  'previous',
  'next',
  'latest',
  'recent',
  'popular',
  'featured',
  'premium',
  // Common adverbs
  'up',
  'down',
  'out',
  'back',
  'off',
  'away',
  'then',
  'now',
  'here',
  'there',
  'where',
  'when',
  'how',
  'all',
  'also',
  'just',
  'only',
  'even',
  'still',
  'already',
  'again',
  'very',
  'well',
  'more',
  'most',
  'never',
  'always',
  'often',
  'usually',
  'often',
  'sometimes',
  'maybe',
  'perhaps',
  'quite',
  'rather',
  'really',
  'simply',
  'also',
  // Tech/dev terms
  'api',
  'url',
  'http',
  'https',
  'json',
  'xml',
  'html',
  'css',
  'sql',
  'dom',
  'npm',
  'node',
  'react',
  'next',
  'typescript',
  'javascript',
  'python',
  'java',
  'ruby',
  'function',
  'method',
  'class',
  'interface',
  'type',
  'const',
  'let',
  'var',
  'async',
  'await',
  'return',
  'import',
  'export',
  'default',
  'extends',
  'implements',
  'new',
  'this',
  'super',
  'static',
  'public',
  'private',
  'protected',
  'abstract',
  'readonly',
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'null',
  'undefined',
  'void',
  'any',
  'never',
  'unknown',
  'enum',
  'namespace',
  'module',
  'package',
  'component',
  'hook',
  'state',
  'props',
  'effect',
  'ref',
  'context',
  'store',
  'action',
  'reducer',
  'selector',
  'middleware',
  'route',
  'controller',
  'service',
  'repository',
  'model',
  'entity',
  'schema',
  'migration',
  'seed',
  'query',
  'mutation',
  'subscription',
  'endpoint',
  'authentication',
  'authorization',
  'encryption',
  'decryption',
  'token',
  'session',
  'cookie',
  'cache',
  'database',
  'table',
  'index',
  'column',
  'row',
  'field',
  'record',
  'document',
  'collection',
  'transaction',
  'commit',
  'rollback',
  'backup',
  'restore',
  'deploy',
  'build',
  'test',
  'lint',
  'check',
  'format',
  'validate',
  'parse',
  'serialize',
  'deserialize',
  'encode',
  'decode',
  'hash',
  'salt',
  'sign',
  'verify',
  'generate',
  'create',
  'read',
  'update',
  'delete',
  'list',
  'search',
  'filter',
  'sort',
  'paginate',
  'aggregate',
  'join',
  'merge',
  'split',
  'trim',
  'replace',
  'match',
  'algorithm',
  'complexity',
  'performance',
  'optimization',
  'refactor',
  'debug',
  'breakpoint',
  'stack',
  'heap',
  'memory',
  'cpu',
  'gpu',
  'network',
  'latency',
  'bandwidth',
  'concurrency',
  'parallelism',
  'asynchronous',
  'synchronous',
  'callback',
  'promise',
  'observable',
  'stream',
  'buffer',
  'pipe',
  'channel',
  'event',
  'listener',
  'handler',
  'middleware',
  'interceptor',
  'decorator',
  'factory',
  'singleton',
  'repository',
  'adapter',
  'facade',
  'proxy',
  'strategy',
  'observer',
  'command',
  'template',
  // Music / audio terms
  'audio',
  'sound',
  'music',
  'tone',
  'frequency',
  'pitch',
  'volume',
  'bass',
  'treble',
  'tempo',
  'rhythm',
  'beat',
  'measure',
  'melody',
  'harmony',
  'chord',
  'scale',
  'key',
  'note',
  'octave',
  'waveform',
  'sine',
  'square',
  'sawtooth',
  'triangle',
  'oscillator',
  'filter',
  'reverb',
  'echo',
  'delay',
  'distortion',
  'compression',
  'equalization',
  'sample',
  'record',
  'playback',
  'export',
  'wav',
  'mp3',
  'ogg',
  'flac',
  'stereo',
  'mono',
  // Image/color terms
  'image',
  'photo',
  'picture',
  'color',
  'colour',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'black',
  'white',
  'gray',
  'grey',
  'hue',
  'saturation',
  'brightness',
  'contrast',
  'opacity',
  'alpha',
  'hex',
  'rgb',
  'hsl',
  'pixel',
  'resolution',
  'width',
  'height',
  'canvas',
  'filter',
  'blur',
  'sharpen',
  'crop',
  'resize',
  'rotate',
  'flip',
  'mirror',
  'overlay',
  'layer',
  'mask',
  'blend',
  // General vocabulary
  'actually',
  'currently',
  'simply',
  'specifically',
  'particularly',
  'generally',
  'basically',
  'essentially',
  'typically',
  'ultimately',
  'clearly',
  'exactly',
  'certainly',
  'absolutely',
  'obviously',
  'definitely',
  'probably',
  'possibly',
  'approximately',
  'relatively',
  'significantly',
  'substantially',
  'considerably',
  'gradually',
  'immediately',
  'suddenly',
  'quickly',
  'slowly',
  'carefully',
  'easily',
  'rapidly',
  'directly',
  'effectively',
  'efficiently',
  'properly',
  'successfully',
  'correctly',
  'accurately',
  'precisely',
  'consistently',
  'continuously',
  'automatically',
  'dynamically',
  'statically',
  'globally',
  'locally',
  'internally',
  'externally',
  'remotely',
  'securely',
  'publicly',
  'privately',
  'explicitly',
  'implicitly',
  'recursively',
  'iteratively',
]);

export class AutoCorrectEngine {
  private readonly dictionary: Set<string>;
  private readonly replacements: Map<string, string>;
  private history: string[] = [];

  constructor(customWords: string[] = []) {
    this.dictionary = new Set([
      ...ENGLISH_CORPUS,
      ...customWords.map((w) => w.toLowerCase()),
    ]);
    this.replacements = new Map(Object.entries(MISSPELLING_MAP));
  }

  // Suffix analysis to mimic professional search engines (checks if standard inflections of dictionary stems are correct)
  private isCorrectWithSuffix(word: string): boolean {
    const w = word.toLowerCase();
    if (this.dictionary.has(w)) return true;

    const suffixes = [
      'ing',
      'ed',
      'es',
      's',
      'ly',
      'er',
      'est',
      'ment',
      'ness',
      'able',
      'ible',
    ];
    for (const suffix of suffixes) {
      if (w.endsWith(suffix)) {
        const stem = w.slice(0, -suffix.length);
        if (this.dictionary.has(stem)) return true;
        // Check doubled consonants, e.g. running -> run
        if (
          stem.length > 1 &&
          stem[stem.length - 1] === stem[stem.length - 2]
        ) {
          const singleConsonantStem = stem.slice(0, -1);
          if (this.dictionary.has(singleConsonantStem)) return true;
        }
        // Check silent e dropping, e.g. coding -> code
        if (this.dictionary.has(stem + 'e')) return true;
        // Check y inflections, e.g. easily -> easy
        if (stem.endsWith('i') && this.dictionary.has(stem.slice(0, -1) + 'y'))
          return true;
      }
    }
    return false;
  }

  public pushToHistory(text: string): void {
    if (this.history[this.history.length - 1] === text) return;
    this.history.push(text);
    if (this.history.length > 5) {
      this.history.shift();
    }
  }

  public getHistory(): string[] {
    return this.history;
  }

  public undo(): string | null {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current
      return this.history[this.history.length - 1]; // Return previous
    }
    return null;
  }

  public analyze(
    text: string,
    config: AutoCorrectConfig = {},
  ): AutoCorrectResult {
    try {
      if (!text || typeof text !== 'string') {
        return {
          originalText: text || '',
          correctedText: text || '',
          corrections: [],
          suggestions: [],
          stats: {
            accuracy: 0,
            correctedCount: 0,
            totalWords: 0,
          },
        };
      }

      const words = text.split(/(\s+|[^\w\s'])/);
      const corrections: AutoCorrectResult['corrections'] = [];
      const suggestionsSet = new Set<string>();

      let charOffset = 0;
      const correctedWords = words.map((chunk) => {
        const lower = chunk.toLowerCase();

        if (/^[\w']+$/.test(chunk)) {
          // Direct dictionary replacement lookup
          if (this.replacements.has(lower)) {
            const suggestion = this.preserveCase(
              chunk,
              this.replacements.get(lower)!,
            );
            corrections.push({
              word: chunk,
              suggestion,
              index: charOffset,
              confidence: 0.98,
              reason: 'common_typo',
            });
            suggestionsSet.add(suggestion);
            charOffset += chunk.length;
            return suggestion;
          }

          // Phonetic & stem suffix check fallback
          if (chunk.length > 2 && !this.isCorrectWithSuffix(lower)) {
            const closest = this.findClosest(lower, 2);
            if (closest && closest.distance <= 2) {
              const suggestion = this.preserveCase(chunk, closest.word);
              corrections.push({
                word: chunk,
                suggestion,
                index: charOffset,
                confidence: 0.85,
                reason: 'phonetic',
              });
              suggestionsSet.add(suggestion);
              charOffset += chunk.length;
              return suggestion;
            }
          }
        }

        charOffset += chunk.length;
        return chunk;
      });

      const correctedText = correctedWords.join('');
      return {
        originalText: text,
        correctedText,
        corrections,
        suggestions: Array.from(suggestionsSet).slice(
          0,
          config.maxSuggestions || 8,
        ),
        stats: {
          totalWords: words.length,
          correctedCount: corrections.length,
          accuracy: corrections.length / words.length,
        },
      };
    } catch (e) {
      return {
        originalText: text || '',
        correctedText: text || '',
        corrections: [],
        suggestions: [],
        stats: { totalWords: 0, correctedCount: 0, accuracy: 0 },
      };
    }
  }

  /** Returns corrected string directly */
  public correct(text: string, config: AutoCorrectConfig = {}): string {
    const res = this.analyze(text, config);
    if (res.correctedText !== text) {
      this.pushToHistory(text); // Save pre-corrected text
      this.pushToHistory(res.correctedText); // Save corrected text
    }
    return res.correctedText;
  }

  /** Returns top correction suggestions for a word or phrase */
  public suggest(text: string, config: AutoCorrectConfig = {}): string[] {
    return this.analyze(text, config).suggestions;
  }

  /** Word-level lookup: is this word valid? */
  public isValid(word: string): boolean {
    return this.dictionary.has(word.toLowerCase());
  }

  /** Extend the dictionary with custom terms */
  public extend(words: string[]): void {
    words.forEach((w) => this.dictionary.add(w.toLowerCase()));
  }

  /** Attach auto-correction to DOM inputs on blur */
  public attachToLayout(selector = 'input[type="text"], textarea'): void {
    if (typeof window === 'undefined') return;
    try {
      const els = document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >(selector);
      els.forEach((el) => {
        el.addEventListener('blur', () => {
          if (el.value) el.value = this.correct(el.value);
        });
      });
    } catch {
      /* no-op in SSR */
    }
  }

  // ---- Private helpers ----

  private preserveCase(original: string, target: string): string {
    if (original === original.toUpperCase() && original.length > 1)
      return target.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1);
    }
    return target;
  }

  private findClosest(
    word: string,
    maxDist: number,
  ): {
    word: string;
    reason: 'phonetic' | 'levenshtein';
    distance: number;
  } | null {
    const wordCode = this.soundex(word);
    let bestLev: { word: string; distance: number } | null = null;

    for (const dictWord of this.dictionary) {
      if (Math.abs(dictWord.length - word.length) > 3) continue;
      // Soundex phonetic
      if (this.soundex(dictWord) === wordCode) {
        const d = this.levenshtein(word, dictWord);
        if (d <= maxDist)
          return { word: dictWord, reason: 'phonetic', distance: d };
      }
      // Levenshtein
      const d = this.levenshtein(word, dictWord);
      if (!bestLev || d < bestLev.distance)
        bestLev = { word: dictWord, distance: d };
    }

    if (bestLev && bestLev.distance <= maxDist) {
      return {
        word: bestLev.word,
        reason: 'levenshtein',
        distance: bestLev.distance,
      };
    }
    return null;
  }

  private soundex(word: string): string {
    const codeMap: Record<string, string> = {
      b: '1',
      f: '1',
      p: '1',
      v: '1',
      c: '2',
      g: '2',
      j: '2',
      k: '2',
      q: '2',
      s: '2',
      x: '2',
      z: '2',
      d: '3',
      t: '3',
      l: '4',
      m: '5',
      n: '5',
      r: '6',
    };
    const a = word.toLowerCase();
    let result = a[0].toUpperCase();
    let prev = codeMap[a[0]] || '0';
    for (let i = 1; i < a.length && result.length < 4; i++) {
      const code = codeMap[a[i]] || '0';
      if (code !== '0' && code !== prev) result += code;
      prev = code;
    }
    return result.padEnd(4, '0');
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length,
      n = b.length;
    const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        dp[j] =
          a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = temp;
      }
    }
    return dp[n];
  }
}
