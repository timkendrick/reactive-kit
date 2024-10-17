import { useFetch } from '@reactive-kit/hooks';

async function main() {
  try {
    const response = await useFetch('https://jsonplaceholder.typicode.com/users/1');
    const user = await response.json();
    return `Hello, ${user.name}!`;
  } catch (error) {
    return `Failed to load remote data (${error.message})`;
  }
}

export default main();
