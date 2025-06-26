import { render } from '@reactive-kit/dom';
import { useFetch } from '@reactive-kit/hooks';

async function Main() {
  const response = await useFetch('https://jsonplaceholder.typicode.com/users/1');

  const { name } = await response.json();

  return <h1>Hello, {name}!</h1>;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
