import { useFetch } from '@reactive-kit/hooks';

async function main() {
  const response = await useFetch('https://jsonplaceholder.typicode.com/users/1');

  const user = response.json();

  return `Hello, ${user.name}!`;
}

export default main();
