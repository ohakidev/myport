/** Where the architecture selection sits, relative to its button row. */
export function layerFillBox(
  list: Pick<DOMRect, "left" | "top">,
  button: Pick<DOMRect, "left" | "top" | "width" | "height">,
) {
  return {
    x: button.left - list.left,
    y: button.top - list.top,
    width: button.width,
    height: button.height,
  };
}
