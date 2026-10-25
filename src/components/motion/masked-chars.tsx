export function MaskedChars({ text }: { text: string }) {
  return text.split("\n").map((line, lineIndex) => (
    <span className="mask-line" aria-hidden="true" key={lineIndex}>
      {Array.from(line).map((char, index) => (
        <span className="mask-clip" key={index}>
          <span data-char>{char === " " ? "\u00A0" : char}</span>
        </span>
      ))}
    </span>
  ));
}
