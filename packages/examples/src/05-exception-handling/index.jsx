import { useFetch } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  try {
    const response = await useFetch('http://@@@');
    const user = await response.json();
    return <h1>Hello, ${user.name}!</h1>;
  } catch (error) {
    return <h2>Failed to load remote data ({error.message})</h2>;
  }
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
