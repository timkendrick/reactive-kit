# ReactiveKit ![status: experimental](https://img.shields.io/badge/status-experimental-yellow)

> Lightweight reactive runtime for building deterministic, real-time full-stack JavaScript applications

## Motivation

Front-end frameworks have revolutionised the way we write real-time application UIs. ReactiveKit extends the reactive paradigm to the whole stack.

Use simple `async` / `await` syntax to declare a reactive function that is recomputed whenever its dependencies change:

```js
import { useWatchFile } from '@reactive-kit/hooks';

// Automatically updates whenever the file contents changes
async function greet() {
  const message = await useWatchFile('/motd.txt', {
    encoding: 'utf-8',
  });
  return `Message of the day: ${message}`;
}

export default greet();
```

...now you have a reactive function that updates when `motd.txt` changes:

```
Message of the day: Make it work, then make it right, then make it fast.
Message of the day: First make the change easy, then make the easy change.
Message of the day: Write tests. Not too many. Mostly integration.
...
```

This function can now be used anywhere within your reactive application. Reactive functions compose together, so you'll always be dealing with the most up-to-date values, with no need to worry about subscriptions or caching.

And what's more, ReactiveKit guarantees deterministic behavior for any given sequence of external effects. This separation enhances testability, allows session recording and time-travel debugging, and improves overall correctness, making your applications more robust and maintainable.

## Examples

### CLI usage

Run async applications right from the command line via the ReactiveKit CLI.

Example source:

```js
import { useTime } from '@reactive-kit/hooks';

// Log the UNIX timestamp every 1000 milliseconds
async function main() {
  const timestamp = await useTime({ interval: 1000 });
  const millis = timestamp.getTime();
  return `Current UNIX time: ${Math.floor(millis / 1000)}`;
}

export default main();
```

Example output:

```
"Current UNIX time: 1739486645"
"Current UNIX time: 1739486646"
"Current UNIX time: 1739486647"
...
```

### JSX example

Run in-browser using familiar JSX syntax:

```jsx
import { useTime } from '@reactive-kit/hooks';
import { render } from '@reactive-kit/dom';

async function Main() {
  const timestamp = await useTime({ interval: 1000 });
  const millis = timestamp.getTime();
  return (
    <h1>
      Current UNIX time: <timestamp>{Math.floor(millis / 1000)}</timestamp>
    </h1>
  );
}

render(<Main />, document.body.getElementsByTagName('main')[0]);
```

See [examples](./packages/examples/src) for more.

## How does it work?

Despite the simple syntax, there's a lot going on under the hood. ReactiveKit is implemented as the combination of two parts:

- A **compiler transform** that translates `async` / `await` syntax into a resumable state machine
- A runtime **effect scheduler** that coordinates these state machines in response to real-time inputs 

By clearly separating impure 'effects' from pure async 'reactive functions', the runtime can resume computation from any `await` point, allowing for fine-grained control of application state.
