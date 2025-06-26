import { render } from '@reactive-kit/dom';
import { useTime } from '@reactive-kit/hooks';

async function Main() {
  // Current timestamp in milliseconds (sampled every 1000 milliseconds)
  const timestamp = await useTime({ interval: 1000 });

  const millis = timestamp.getTime();

  return (
    <h1>
      Current UNIX time: <timestamp>{Math.floor(millis / 1000)}</timestamp>
    </h1>
  );
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
