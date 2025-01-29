import generate from './scripts/generate/index.mjs';

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  generate(plop);
}
