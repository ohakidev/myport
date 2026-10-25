/** Nav underline. Drawn for the current page or the link under the pointer. */
export function navLineScale(current: boolean, hovering: boolean) {
  return current || hovering ? 1 : 0;
}

/** Primary actions press in slightly. They do not overshoot rest. */
export function ctaPressScale(pressed: boolean) {
  return pressed ? 0.98 : 1;
}
