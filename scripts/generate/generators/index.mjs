import pkg from './package.mjs';
import plugin from './plugin.mjs';

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  pkg(plop);
  plugin(plop);
}
