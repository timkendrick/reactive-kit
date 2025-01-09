import { hash } from '@reactive-kit/hash';
import { useFetch, useTime } from '@reactive-kit/hooks';

async function main() {
  // Opaque idempotency token that changes every 1000ms
  const token = await useTime({ interval: 1000 });

  const response = await useFetch({
    url: 'http://localhost:3000/',
    token: hash(token),
  });

  const timestamp = await response.text();

  return `Current UNIX time: ${timestamp}`;
}

export default main();
