// Keys of a physical keyboard: left and right arrows turn the chapter, Ctrl+F opens search.
// On Android they come from the activity (plugins/withKeyboardKeys.js); on the web, from
// the page. A sheet or menu that is open holds them back, so an arrow never turns the
// chapter under it.
import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

export type HardwareKey = 'left' | 'right' | 'find';

let blockers = 0;

/** While `active`, keys go to nothing (an open sheet or menu calls this). */
export function useBlockKeys(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    blockers++;
    return () => {
      blockers--;
    };
  }, [active]);
}

/** Calls `handler` for each key while `enabled` and nothing holds the keys back. */
export function useHardwareKeys(handler: (key: HardwareKey) => void, enabled: boolean): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const fire = (key: HardwareKey) => {
      if (blockers === 0) latest.current(key);
    };
    if (Platform.OS === 'web') {
      const onKey = (e: KeyboardEvent) => {
        const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
        if (e.repeat || typing) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          fire('find');
        } else if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') fire('left');
        else if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') fire('right');
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    const sub = DeviceEventEmitter.addListener('hardwareKey', (key: HardwareKey) => fire(key));
    return () => sub.remove();
  }, [enabled]);
}
