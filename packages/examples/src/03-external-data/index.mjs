import { useFetch } from '@reactive-kit/hooks';

async function main() {
  const response = await useFetch('https://jsonplaceholder.typicode.com/users/1');

  const { name } = await response.json();

  return `Hello, ${name}!`;
}

export default main();
