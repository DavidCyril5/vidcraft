/**
 * Utility for managing Paxsenix API keys with random selection.
 */

export const PAXSENIX_API_KEYS = [
  'sk-paxsenix-lEGhRjBd-q-dJAY0l3qYQGLf3I3muG7AfdTeC9vVtLRoNdQ5',
  'sk-paxsenix-NYeLyJgZ8wnfTOgI2gq8d9I1JwS6fAkoGZkBvRdfSB3W5APv',
  'sk-paxsenix-DZeDmwNiIXQ6Nur0YkpX0N_j4_iyChTJWJMoZkuv6DDsWfW2',
  'sk-paxsenix-Cl8f5n5OgXenDDtfk2LHHfLa25x2PJNLxkBx724uvL018ME-',
  'sk-paxsenix-I6WfdPXmMEO_HzYI5Ow--vnp0h1qdY4LPkf-UcqbcfBotAFo'
];

/**
 * Returns a random API key from the list of provided Paxsenix keys.
 */
export function getRandomPaxsenixKey(): string {
  const randomIndex = Math.floor(Math.random() * PAXSENIX_API_KEYS.length);
  return PAXSENIX_API_KEYS[randomIndex];
}
