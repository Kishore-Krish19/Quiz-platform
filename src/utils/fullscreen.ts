/**
 * Puts the whole app in full screen. Browsers allow this only in response to the user's
 * own click or key press, and may refuse regardless; a refusal is not worth surfacing,
 * so this resolves to whether the screen ended up full screen.
 */
export async function enterAppFullscreen(): Promise<boolean> {
  if (document.fullscreenElement) return true;
  if (!document.fullscreenEnabled) return false;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Enters full screen at the next click or key press, for when a page was reached without
 * one — a reload restores the session with no click, and browsers always leave full
 * screen on reload — or the browser refused earlier. Stops listening as soon as full
 * screen is on, so leaving it on purpose afterwards is respected.
 * Returns a function that stops listening.
 */
export function enterFullscreenOnNextInteraction(): () => void {
  if (document.fullscreenElement || !document.fullscreenEnabled) return () => {};

  function onInput(event: Event) {
    // Esc never grants the permission full screen needs.
    if (event instanceof KeyboardEvent && event.key === 'Escape') return;
    // The FULLSCREEN button makes its own request; asking here as well would use up the
    // click's one-time permission before the button's own handler runs.
    if (event.target instanceof Element && event.target.closest('[data-fullscreen-toggle]')) return;
    void enterAppFullscreen();
  }
  function onChange() {
    if (document.fullscreenElement) stop();
  }
  function stop() {
    document.removeEventListener('click', onInput, true);
    document.removeEventListener('keydown', onInput, true);
    document.removeEventListener('fullscreenchange', onChange);
  }

  // Capture phase and never stopped: the click still reaches whatever was clicked,
  // so a first click on an answer option both answers and goes full screen.
  document.addEventListener('click', onInput, true);
  document.addEventListener('keydown', onInput, true);
  document.addEventListener('fullscreenchange', onChange);
  return stop;
}
