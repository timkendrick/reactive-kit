import { useFetch } from '@reactive-kit/hooks';

async function main() {
  const result = await useCatch(
    (error) => `Failed to load remote data (${error.message})`,
    (async function () {
      const response = await useFetch('about:blank');
      const user = await response.json();
      return `Hello, ${user.name}!`;
    })(),
  );
  return result;
}

export default main();
