import { useFetch } from '@reactive-kit/hooks';

async function main() {
  try {
    const response = await useFetch('http://@@@');
    const { name } = await response.json();
    return `Hello, ${name}!`;
  } catch (error) {
    return `Failed to load remote data (${error.message})`;
  }
}

export default main();
