/**
 * jules edit: Text-splitting helper to split text into slides/pages for Instagram Text-to-Canvas posts
 */
export function splitTextIntoSlides(text: string, maxCharsPerSlide = 160): string[] {
  const words = text.trim().split(/\s+/);
  const slides: string[] = [];
  let currentSlide = '';

  for (const word of words) {
    if ((currentSlide + ' ' + word).trim().length <= maxCharsPerSlide) {
      currentSlide = (currentSlide + ' ' + word).trim();
    } else {
      if (currentSlide) {
        slides.push(currentSlide + ' -');
      }
      currentSlide = word;
    }
  }
  if (currentSlide) {
    slides.push(currentSlide);
  }
  return slides;
}
