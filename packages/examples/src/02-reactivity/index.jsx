import { useTime } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  // Current timestamp in milliseconds (sampled every 1000 milliseconds)
  const timestamp = await useTime({ interval: 1000 });

  const millis = timestamp.getTime();

  return <div>Current UNIX time: {Math.floor(millis / 1000)}</div>;
}

render(Main, document.body.getElementsByTagName('main')[0]);
