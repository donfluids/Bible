import Constants from 'expo-constants';
import { createContext, useContext } from 'react';

export * from './editions';
import { EDITIONS, isEditionId } from './editions';
import type { Edition, EditionId } from './editions';

const configured = (Constants.expoConfig?.extra as { edition?: string } | undefined)?.edition;

/**
 * The edition the build configuration claims. The database bundled with the app is
 * the final word (its meta table carries the edition it was built for), so the app
 * shell resolves the edition from the database and provides it through context.
 */
export const CONFIGURED_EDITION: Edition = EDITIONS[isEditionId(configured) ? configured : 'en'];

/** The edition named in the build configuration, if it names one. */
export const CONFIGURED_EDITION_ID: EditionId | undefined = isEditionId(configured) ? configured : undefined;

export const EditionContext = createContext<Edition>(CONFIGURED_EDITION);

export function useEdition(): Edition {
  return useContext(EditionContext);
}
