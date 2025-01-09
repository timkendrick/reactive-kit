import { hash } from '@reactive-kit/hash';
import { useFetch, useTime } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  // Opaque idempotency token that changes every 1000ms
  const token = await useTime({ interval: 1000 });

  const response = await useFetch({
    url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
    token: hash(token),
  });

  const payload = await response.json();

  return <h1>Current UNIX time: {payload.unixtime}</h1>;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
