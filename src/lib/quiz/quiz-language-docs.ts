/**
 * PingWorld Quiz Authoring Language & Syntax Reference Data
 * Contains comprehensive token, parameter, and operator documentation.
 */

export interface SyntaxDocItem {
  name: string;
  syntax: string;
  description: string;
  parameters?: Array<{ name: string; description: string }>;
  example: string;
  result: string;
}

export const QUIZ_SYNTAX_DOCS = {
  title: 'PingWorld Quiz Authoring Language (PQAL)',
  version: '2.0',
  description:
    'A reactive piping, mention, and evaluation syntax engine built for PingWorld quizzes, forms, and dynamic branching workflows.',
  mainDocsUrl: '/docs/quizzable',

  parametersExplained: [
    {
      param: 'q{n} / @q1',
      meaning:
        'The sequential global question number (1-indexed). @q1 references the taker’s answer to question 1.',
    },
    {
      param: 'cat_{name}_q{n}',
      meaning:
        'Category-stacked question identifier. {name} is the normalized group name (lowercase, spaces replaced by underscores), and {n} is the question index within that category (e.g. @cat_math_q2).',
    },
    {
      param: 'ans_{questionId}',
      meaning:
        'Direct answer lookup by exact question ID (e.g. @ans_q1 or @ans_cat_science_q1).',
    },
    {
      param: '@show:(...)',
      meaning:
        'Directive that outputs the wrapped text/value when the preceding condition evaluates to true.',
    },
    {
      param: '\\@ (Backslash Escape)',
      meaning:
        'Prefixing an @ with a backslash (\\@) prevents PingWorld from evaluating it as a dynamic token, rendering literal "@" in the final text.',
    },
    {
      param: 'Quotes in @eval',
      meaning:
        'Values enclosed in quotes ("text" or \'text\') are treated as literal text strings. Unquoted identifiers are treated as keywords or dynamic variables.',
    },
  ],

  tokenCategories: [
    {
      category: 'Participant Details (Metadata Piping)',
      items: [
        {
          name: 'Full Name',
          syntax: '@FullName or @name',
          description: "Injects participant's full name provided in the intro step.",
          example: 'Welcome, @FullName! Ready for your test?',
          result: 'Welcome, Jane Doe! Ready for your test?',
        },
        {
          name: 'First Name',
          syntax: '@firstname',
          description: "Extracts first name from the participant's full name.",
          example: 'Good day, @firstname!',
          result: 'Good day, Jane!',
        },
        {
          name: 'Custom Details',
          syntax: '@Gender, @Age, @Email, @Phone',
          description: 'Injects any custom field configured in the quiz detail collector.',
          example: 'Registered Email: @Email | Category: @Gender',
          result: 'Registered Email: jane@example.com | Category: Female',
        },
      ],
    },
    {
      category: 'Question Answer Piping',
      items: [
        {
          name: 'Independent Question Answer',
          syntax: '@q{n}',
          description: 'Pipes the answer value given by the participant for question {n}.',
          example: 'Earlier you selected: @q1',
          result: 'Earlier you selected: Option B',
        },
        {
          name: 'Categorized Question Answer',
          syntax: '@cat_{category}_q{n}',
          description: 'Pipes the answer from a specific question within a named category stack.',
          example: 'Your favorite language was @cat_coding_q1.',
          result: 'Your favorite language was TypeScript.',
        },
        {
          name: 'Dynamic Sub-piping / Nested Mentions',
          syntax: '@cat_:(@DetailName)_q{n}',
          description:
            'Nests a participant detail or token inside category mentions to resolve target questions dynamically.',
          example: 'Question for your track: @cat_:(@Gender)_q1',
          result: 'Resolves to @cat_male_q1 or @cat_female_q1 based on participant gender.',
        },
      ],
    },
    {
      category: 'Programmatic Logic & Branching (@eval)',
      items: [
        {
          name: 'Conditional Ternary with @show',
          syntax: '@eval:{condition @show:(trueText) : @show:(falseText)}',
          description:
            'Evaluates condition using =, !=, or MATCH. Outputs trueText if condition is met, otherwise falseText.',
          example: '@eval:{@Gender = "male" @show:("Gentleman") : @show:("Lady")}',
          result: 'Lady (if Gender is female)',
        },
        {
          name: 'Keyword Match Operator',
          syntax: '@eval:{token MATCH "keyword" @show:(text) [: @show:(otherwise)]}',
          description: 'Checks if the target answer includes the specified substring or keyword. The fallback is optional; with no fallback, a non-match outputs an empty string.',
          example: '@eval:{@q1 MATCH "Python" @show:("Python Developer")}',
          result: 'Python Developer (if answer contains Python)',
        },
        {
          name: 'Fallback Default (OR / ||)',
          syntax: '@eval:{token || "Default Text"}',
          description: 'Provides fallback text if a token or detail was left blank or empty.',
          example: 'Hello, @eval:{@FullName || "Valued User"}!',
          result: 'Hello, Valued User! (if FullName is not specified)',
        },
      ],
    },
    {
      category: 'Scoring & Metrics Piping',
      items: [
        {
          name: 'Live & Total Score',
          syntax: '@score',
          description: 'Pipes the participant’s currently earned numeric score.',
          example: 'You scored @score points!',
          result: 'You scored 8 points!',
        },
        {
          name: 'Total Questions Count',
          syntax: '@total',
          description: 'Pipes the total number of scored questions in this quiz.',
          example: 'Out of @total questions.',
          result: 'Out of 10 questions.',
        },
        {
          name: 'Percentage Completion / Accuracy',
          syntax: '@percentage',
          description: 'Pipes the calculated percentage (score / total * 100%).',
          example: 'Accuracy: @percentage',
          result: 'Accuracy: 80%',
        },
      ],
    },
  ],
};
