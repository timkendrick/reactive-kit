import { useWebSocket } from '@reactive-kit/hooks';

async function main() {
  const response = await useWebSocket('http://localhost:8080/');

  const payload = await response.json();

  return payload;
}

export default main();
