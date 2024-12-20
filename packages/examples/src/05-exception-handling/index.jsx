import { useFetch } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  try {
    const response = await useFetch('http://@@@');
    const user = await response.json();
    return `Hello, ${user.name}!`;
  } catch (error) {
    return `Failed to load remote data (${error.message})`;
  }
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
