import { useFetch, useFallback } from '@reactive-kit/hooks';

async function main() {
  const response = await useFallback(
    () => null,
    useFetch('https://jsonplaceholder.typicode.com/users/1'),
  );
  if (response === null) return 'Loading...';

  const user = await response.json();
  return `Hello, ${user.name}!`;
}

export default main();
