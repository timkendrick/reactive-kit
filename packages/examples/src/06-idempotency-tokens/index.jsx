import { hash } from '@reactive-kit/hash';
import { useFetch, useTime } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  // Opaque idempotency token that changes every 1000ms
  const token = hash(await useTime({ interval: 1000 }));

  const response = await useFetch({
    url: 'http://localhost:3000/',
    token,
  });

  const timestamp = Number(await response.text());

  return (
    <h1>
      Current UNIX time: <timestamp>{timestamp}</timestamp>
    </h1>
  );
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
