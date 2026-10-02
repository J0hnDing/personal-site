export function prepareWordmarkIntro(canvas: HTMLElement | null) {
  const title = canvas?.querySelector<HTMLElement>(".gallery-wordmark");
  if (!title) return;

  const openingSize = parseFloat(getComputedStyle(title).fontSize);
  const previousSize = title.style.fontSize;
  title.style.fontSize = "var(--wordmark-final-size)";
  const finalSize = parseFloat(getComputedStyle(title).fontSize);
  title.style.fontSize = previousSize;

  // Measure responsive typography once; animate scale on the compositor.
  title.style.setProperty(
    "--wordmark-opening-scale",
    `${openingSize / finalSize}`,
  );
}
