import { render } from '@reactive-kit/dom';
import { useFetch } from '@reactive-kit/hooks';

async function Main() {
  try {
    const response = await useFetch('http://@@@');
    const { name } = await response.json();
    return <h1>Hello, ${name}!</h1>;
  } catch (error) {
    return [<h2>Failed to load remote data</h2>, <pre>{error.message}</pre>];
  }
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
