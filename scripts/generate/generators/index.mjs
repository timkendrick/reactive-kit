import pkg from './package/index.mjs';
import plugin from './plugin/index.mjs';

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  pkg(plop);
  plugin(plop);
}
