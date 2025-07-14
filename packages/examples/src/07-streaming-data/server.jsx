import { useTime } from '@reactive-kit/hooks';

async function main() {
  // Current timestamp in milliseconds (sampled every 1000 milliseconds)
  const timestamp = await useTime({ interval: 1000 });

  const millis = timestamp.getTime();

  return <h1>Current UNIX time: {Math.floor(millis / 1000)}</h1>;
}

export default main();
