import { COMPANY } from '@/lib/config/company';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';
import { PW_MEDIA_PREFIX, unpackPingWorldMediaUrl } from '@/lib/quiz/quiz-piping';
import {capFirst} from '../utils';
import { PINGWORLD_ATTRIBUTION_MARKER } from '@/lib/pingworld-attribution';

type PdfExportInput = {
  quiz: any;
  responses: any[];
  setterUsername?: string;
  setterDisplayName?: string;
  responseIndex?: number;
  takerNumber?: number;
};

const stripMarkup = (value: unknown) =>
  String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const answerText = (answer: any, question: any) => {
  if (!answer) return 'Unanswered';
  if (answer.passed) return 'Skipped';
  if (answer.fileUrl)
    return `${answer.fileName || answer.fileType || 'Uploaded media'}: ${answer.fileUrl}`;
  const raw = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
  const options = Array.isArray(question?.options) ? question.options : [];
  return (
    raw
      .map((value:any) => {
        const option = options.find(
          (item: any, index: number) =>
            String(item?.id ?? index) === String(value) ||
            String(index) === String(value),
        );
        return stripMarkup(option?.text ?? value);
      })
      .filter(Boolean)
      .join(', ') || 'No answer recorded'
  );
};

async function shrinkImage(
  url: string,
): Promise<{
  data: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
} | null> {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return {
      data: canvas.toDataURL('image/jpeg', 0.7),
      format: 'JPEG',
      width,
      height,
    };
  } catch {
    return null;
  }
}

export async function exportQuizFeedbackPdf (
  input: PdfExportInput,
  filename: string,
) {
  const {jsPDF} = await import('jspdf');
  const doc = new jsPDF({unit: 'pt', format: 'a4', compress: true});
  doc.setProperties({
    title: `${input.quiz.title || 'Assessment'} feedback`,
    subject: `Made with PingWorld · ${COMPANY.domain}`,
    keywords: `PingWorld, ${PINGWORLD_ATTRIBUTION_MARKER}, ${COMPANY.domain}`,
    creator: 'PingWorld',
    author: input.setterDisplayName || input.setterUsername || 'PingWorld user',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const imageCache = new Map<string, Awaited<ReturnType<typeof shrinkImage>>>();

  const addPageIfNeeded = (height = 18) => {
    if(y + height > pageHeight - 50) {
      doc.addPage();

      y = margin;
    }
  };
  const addText = (
    text: unknown,
    options: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
      width?: number;
      y?: number;
    } = {},
  ) => {
    const value = stripMarkup(text);
    if(!value) return;
    const size = options.size || 12;
    const x = margin + (options.indent || 0);
    const lines = doc.splitTextToSize(
      value,
      options.width || contentWidth - (options.indent || 0),
    );

    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(options.color || [40, 48, 66]));
    const height = lines.length * (size + 3) + 2;
    addPageIfNeeded(height);
    const firstLineY = y;
    doc.text(lines, x, options.y ? options.y + y : y);
    for(const match of value.matchAll(/https?:\/\/[^\s)]+/g)) {
      doc.link(
        x,
        firstLineY - size,
        options.width || contentWidth - (options.indent || 0),
        height,
        {url: match[0]},
      );
    }
    y += height;
  };
  const heading = (value: string) => {
    y += 8;
    addText(value, {size: 16, bold: true, color: [71, 55, 168], y:10});
    doc.setDrawColor(71, 55, 168);
    doc.line(margin, y - 5 , pageWidth - margin, y - 5 );
    y += 8;
  };

  const addMargin = (value: number) => {

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(value ?? y);
    doc.setTextColor(255, 255, 255, 0);
    doc.text('--', pageWidth, value ? value + y : 20, {
      lineHeightFactor: value + y,
      charSpace: value,
    });
  };

  const addMedia = async (url: unknown, label: string, mediaType = '', indent:number = 0) => {
    if(typeof url !== 'string' || !url.trim()) return;
    const rawValue = url.trim();
    const unpacked = unpackPingWorldMediaUrl(rawValue);
    const value = unpacked.url || rawValue;
    const imageLike =
      mediaType.toLowerCase().startsWith('image') ||
      /\.(png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)/i.test(value);
    if(
      !imageLike ||
      (value.startsWith('data:') && !value.startsWith('data:image/'))
    ) {
      addText(
        `${label}: ${unpacked?.name || 'Media'} - ${unpacked.type ?? ''} ${unpacked?.size ? `(${unpacked.size})` : ''}. ${/^https?:\/\//i.test(value) ? `Open or download: ${value}` : 'Media URL unavailable in this export.'}`,
        {size: 12, indent: indent ?? 5, color: [40, 106, 158]},
      );
      return;
    }
    let image = imageCache.get(value);
    if(image === undefined) {
      image = await shrinkImage(value);
      imageCache.set(value, image);
    }
    if(!image) {
      addText(`${label} (image link): ${value}`, {
        size: 12,
        indent: 10,
        color: [40, 106, 158],
      });
      return;
    }
    const maxWidth = contentWidth * 0.55;
    const maxHeight = 180;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    addPageIfNeeded(height + 16);
    doc.addImage(
      image.data,
      image.format,
      margin + 10,
      y - 2 ,
      width,
      height,
      undefined,
      'FAST',
    );
    y += height + 8;
    addText(`${label}`, {size: 10, indent: 5 , color: [40, 106, 158]});
  };

  const responseList =
    input.responseIndex === undefined ?
      input.responses.filter((response) => response.status !== 'in_progress')
      : [input.responses[input.responseIndex]].filter(Boolean);
      const logoUrl =
      typeof window !== 'undefined' ?
        `${window.location.origin}/images/logo.png`
          : '';

  if(logoUrl) {
    const logo = await shrinkImage(logoUrl);
    if(logo)
      doc.addImage(
        logo.data,
        logo.format,
        (pageWidth - 38) / 2,
        y - 5,
        38,
        38,
        undefined,
        'FAST',
      );
  }
  y += logoUrl ? 44 : 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(60, 50, 160);
  doc.text(COMPANY.name, pageWidth / 2, y + 5, {align: 'center', charSpace:1});
  y += 24;
  doc.setFontSize(18);
  doc.text(
    stripMarkup(input.quiz.title || 'Assessment feedback'),
    pageWidth / 2,
    y,
    {align: 'center', maxWidth: contentWidth},
  );
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    `Setter: ${input.setterDisplayName || 'Assessment setter'}${input.setterUsername ? ` · @${input.setterUsername}` : ''}`,
    pageWidth / 2,
    y,
    {align: 'center'},
  );
  y += 25;
  addText(
    `Assessment ID: ${input.quiz.id || 'Unavailable'}   ·   Type: ${input.quiz.type || 'quiz'}   ·   Questions: ${(input.quiz.questions || []).length}   ·   Categories: ${[...new Set((input.quiz.questions || []).map((q: any) => q.category).filter(Boolean))].length}`,
    {size: 14, bold: true},
  );
  addText(
    `Categories: ${[...new Set((input.quiz.questions || []).map((q: any) => stripMarkup(q.category)).filter(Boolean))].join(', ') || 'General'}`,
    {size: 12},
  );
  {
    input.quiz.description &&
    addText(
      `Introduction: ${input.quiz.description || 'No introduction configured.'}`,
      {size: 12},
    );
  }
  {
    {
      input.quiz.endScreen?.message &&
        addText(
          `Completion: ${input.quiz.endScreen?.message || 'Thank you for completing this assessment.'}`,
          {size: 12},
        );
    }
    addText(
      `Branch scoring: ${input.quiz.calculateAllBranches ? 'All branches' : 'Selected paths, including the full selected category'}`,
      {size: 12},
    );

    for(
      let responseIndex = 0;
      responseIndex < responseList.length;
      responseIndex++
    ) {
      const response = responseList[responseIndex];
      addMargin(35);

      heading(
        `Taker ${input.takerNumber || (input.responseIndex === undefined ? responseIndex + 1 : input.responseIndex + 1)}`,
      );
      addText(
        `Score: ${response.score ?? 0} / ${response.scorePossible ?? response.totalQuestions ?? 0}`)
        addText(
          `Questions: ${response.answeredQuestions === response.totalQuestions ?
          `Attempted all ${response.totalQuestions} Questions.` :
          `${response.answeredQuestions ?? 0} attempted / ${response.totalQuestions ?? 0} in path`
        } `,
      );

      addText(
        `Submission status: ${response.submissionReason === 'violation' ? 'Security violation'
          : response.submissionReason === 'timeout' ? 'Timed out'
            : response.submissionReason === 'self_submit' ? 'Self-submitted'
              : 'Completed'
        }`,
      );
      addText(
        `Started: ${response.startedAt ? new Date(response.startedAt).toLocaleString() : 'Unavailable'}   ||   Submitted: ${new Date(response.submittedAt || response.timestamp).toLocaleString()}   ${response.durationSeconds ? `   ||   Duration: ${typeof response.durationSeconds === 'number' ? `${Math.floor(response.durationSeconds / 60)}m ${response.durationSeconds % 60}s` : 'Unavailable'}` : ''}`,
      );
      const detailEntries = Object.entries(response.userData || {}).filter(
        ([key]) =>
          ![
            'answeredQuestions',
            'scorePossible',
            'currentPathQuestionIds',
            'pathQuestionSnapshots',
            'branchHistory',
            'submissionReason',
            'startedAt',
            'durationSeconds',
          ].includes(key),
      );
      if(detailEntries.length) {
        addText('Participant Details', {bold: true, size: 14, });

        for(let i = 0; i < detailEntries.length; i += 2) {
          addText(
            `${detailEntries[i][0]}: ${detailEntries[i][1]}${detailEntries[i + 1] ? `   ||   ${detailEntries[i + 1][0]}: ${detailEntries[i + 1][1]}` : ''}`,
            {size: 12, indent: 5},
          );
        }
      }
      if(response.isSignedUser && response.signedUser) {
        addText(
          `Signed user: ${response.signedUser.displayName || ''} || @${response.signedUser.username || ''} || ${response.signedUser.email || ''}`,
          {size: 10, bold: true},
        );
      }
      const answers = new Map(
        (response.answers || []).map((answer: any) => [
          String(answer.questionId),
          answer,
        ]),
      );
      for(const branch of response.branchHistory || []) {
        const branchAnswers = (response.answers || []).filter((answer: any) =>
          branch.questionIds?.includes(String(answer.questionId)),
        );
        const triggerIndex = (input.quiz.questions || []).findIndex((question: any) => String(question.id) === String(branch.fromQuestionId));
        const branchLabel = `Question ${triggerIndex >= 0 ? triggerIndex + 1 : 'in flow'} → ${branch.category ? `Group: ${branch.category}` : 'General flow'}`;
        addText(
          `${branchLabel} || ${branch.questionIds?.length || 0} questions || ${branchAnswers.filter((answer: any) => !answer.passed && answer.answer !== undefined && answer.answer !== '').length} attempted || ${branchAnswers.filter((answer: any) => answer.correct === false).length} failed || ${branchAnswers.filter((answer: any) => answer.passed).length} skipped`,
          {size: 12, indent: 5},
        );
      }
      const savedPath =
        response.pathQuestionSnapshots ||
        response.userData?.pathQuestionSnapshots;
      const pathIds =
        response.currentPathQuestionIds ||
        response.userData?.currentPathQuestionIds;
      const pathQuestions =
        Array.isArray(savedPath) && savedPath.length ? savedPath
          : Array.isArray(pathIds) && pathIds.length ?
            pathIds
              .map((id: string) =>
                input.quiz.questions?.find(
                  (question: any) => String(question.id) === String(id),
                ),
              )
              .filter(Boolean)
            : (response.answers || [])
              .map(
                (answer: any) =>
                  answer.questionSnapshot ||
                  input.quiz.questions?.find(
                    (question: any) =>
                      String(question.id) === String(answer.questionId),
                  ),
              )
              .filter(Boolean);
      heading('Response details');
      for(
        let questionIndex = 0;
        questionIndex < pathQuestions.length;
        questionIndex++
      ) {
        const question: any = pathQuestions[questionIndex];
        const answer: any =
          answers.get(String(question.id)) ||
          (response.answers || []).find(
            (item: any) => String(item.questionId) === String(question.id),
          );
        addText(
          `${questionIndex + 1}. (${question.category ? `${question.category} - ` : ''} ${question.type ? capFirst(question.type.toString().replaceAll('_', ' ')) : ''}) : ${question.text || 'Question'}`,
          {size: 13, bold: true},
        );
        const answerHistory = Array.isArray(answer?.answerHistory) ? answer.answerHistory : [];
        if (answerText(answer, question).includes(PW_MEDIA_PREFIX)) {
          await addMedia(
            answerText(answer, question),
            'Answer media',
            unpackPingWorldMediaUrl(answerText(answer, question)).type,
            25,
          );
        } else if (!answerHistory.length) {
          addText(
            `Answer: ${answerText(answer, question)}${typeof answer?.correct === 'boolean' ? ` · ${answer.correct ? '(Correct)' : '(Incorrect)'}` : ''}`,
            { size: 12 },
          );
        }
        if (answerHistory.length) {
          answerHistory.forEach((revision: any, revisionIndex: number) => {
            addText(`(${revisionIndex + 1}) ${answerText(revision, question)}`, { size: 11, indent: 12 });
          });
          addText(`(${answer.answerHistory.length + 1}) ${answerText(answer, question)}`, { size: 11, indent: 12 });
        }
        if(question.correctExplanation)
          addText(`Explanation: ${question.correctExplanation}`, {
            size: 12,
            indent: 15,
          });
        const correctIndex = decodeStoredCorrectAnswer(question.correctIndex);
        const correctValues =
          Array.isArray(correctIndex) ? correctIndex.map(String)
            : correctIndex === null || correctIndex === undefined ? []
              : [String(correctIndex)];
        for(
          let optionIndex = 0;
          optionIndex < (question.options || []).length;
          optionIndex++
        ) {
          const option = question.options[optionIndex];
          const optionId = String(option?.id ?? optionIndex);
          addText(
            `${correctValues.includes(optionId) || correctValues.includes(String(optionIndex)) ? 'Correct option' : 'Option'}: ${option?.text ?? option}${option?.explanation ? ` || Explanation: ${option.explanation}` : ''}${option?.scoreWeight !== undefined ? ` || Weight: ${option.scoreWeight}` : ''}`,
            {size: 12, indent: 25},
          );
          if(option?.imageUrl || option?.uploadUrl)
            await addMedia(
              option.imageUrl || option.uploadUrl,
              'Option media',
              option.imageUrl ? 'image/' : option.uploadType || '',
              25,
            );
        }
        if(question.imageUrl || question.uploadUrl)
          await addMedia(
            question.imageUrl || question.uploadUrl,
            'Question media',
            question.imageUrl ? 'image/' : question.uploadType || '', 25,
          );
        if(answer?.fileUrl)
          await addMedia(
            answer.fileUrl,
            answer.fileType || 'Participant upload',
            answer.fileType || '', 25,
          );
        y += 4;
      }
    }

    // Compact participant score rundown for quick marking.
    doc.addPage();
    y = margin;
    heading('Assessment score rundown');
    for (let i = 0; i < responseList.length; i++) {
      const response = responseList[i];
      const details = Object.entries(response.userData || {})
        .filter(([key]) => !['answeredQuestions', 'scorePossible', 'currentPathQuestionIds', 'pathQuestionSnapshots', 'branchHistory', 'submissionReason', 'startedAt', 'durationSeconds'].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ');
      addText(`Taker ${input.takerNumber || i + 1}  |  ${details || response.signedUser?.displayName || 'Participant'}  |  Score: ${response.score ?? 0} / ${response.scorePossible ?? response.totalQuestions ?? 0}`, { size: 11 });
    }

    const totalPages = doc.getNumberOfPages();
    let watermark: string | null = null;
    try {
      const logoResponse = await fetch(`${window.location.origin}/images/logo-trans.png`, { credentials: 'omit' });
      if (logoResponse.ok) {
        const blob = await logoResponse.blob();
        watermark = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* Watermark is optional when offline. */ }
    for(let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      if (watermark) {
        try {
          const pdf = doc as any;
          if (typeof pdf.saveGraphicsState === 'function' && pdf.GState) {
            pdf.saveGraphicsState();
            pdf.setGState(new pdf.GState({ opacity: 0.1 }));
            pdf.addImage(watermark, 'PNG', pageWidth * 0.28, pageHeight * 0.35, pageWidth * 0.44, pageWidth * 0.44);
            pdf.restoreGraphicsState();
          }
        } catch { /* Continue exporting readable content if transparency is unsupported. */ }
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(105, 110, 126);
      doc.text(`Made with PingWorld · ${COMPANY.domain} · ${PINGWORLD_ATTRIBUTION_MARKER}`, margin, pageHeight - 22);
      doc.textWithLink(COMPANY.domain, pageWidth - margin, pageHeight - 22, {
        align: 'right',
      });
      doc.text(`${page} / ${totalPages}`, pageWidth / 2, pageHeight - 22, {
        align: 'center',
      });


    }
    doc.save(`${filename.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`);
  }
}
