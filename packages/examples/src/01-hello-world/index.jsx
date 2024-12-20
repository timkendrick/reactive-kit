import { render } from '@reactive-kit/dom';

async function Main() {
  return <h1>Hello, world!</h1>;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
