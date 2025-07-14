import { useWebSocket } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  const socket = await useWebSocket('http://localhost:8080/');

  const content = await socket.json();

  return content;
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
