import { useCatch, useFetch } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  const result = await useCatch(
    (error) => <code>{`Unable to load remote data: ${error.message}`}</code>,
    (async function () {
      const response = await useFetch('about:blank');
      const user = await response.json();
      return <h1>Hello, {user.name}!</h1>;
    })(),
  );
  return result;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
