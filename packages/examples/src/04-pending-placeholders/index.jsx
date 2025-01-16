import { useFetch, useFallback } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  const response = await useFallback(
    () => null,
    useFetch('https://jsonplaceholder.typicode.com/users/1'),
  );
  if (response === null) return 'Loading...';

  const { name } = await response.json();
  return <h1>Hello, {name}!</h1>;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
