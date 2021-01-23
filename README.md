# xstate offline machine

The `offline` machine should be used within a browser to enable offline/online state management.
It reacts to network state changes (You can force this in devtools) and has the ability to force `offline` for testing apps in an exact state.

The machine does this automatically and posts state change messages out to the parent machine.

## Commands

Install using:

```bash
yarn add xstate-offline-machine
# or npm install -S xstate-offline-machine
```

## Integration

> Should be invoked by a parent machine

The `offline` machine is much more useful when invoked by a parent. The idea is that this can be reused in any app, that needs to handle offline capabilities.

### Example

```js
import { assign, send, spawn } from 'xstate';
import isOfflineMachine from './offline.machine';

const { Machine } = require('xstate');

const appMachine = Machine({
  id: 'app',
  initial: 'idle',
  context: {
    offline: undefined,
  },
  states: {
    idle: {
      on: {
        INITIALIZE: {
          target: 'ready',
          actions: assign({
            offline: () => spawn(isOfflineMachine, { name: 'offline' }),
          }),
        },
      },
    },
    ready: {
      on: {
        // V5 will allow GLOB matching here
        '*': [
          {
            actions: send((_, event) => event, {
              to: context => context.offline,
            }),
            cond: (c, e) => e.type.startsWith('OFFLINE_'),
          },
        ],
      },
    },
  },
});
```

And then running the app like this

```js
import appMachine from './machines/app.machine';

const app = interpret(appMachine).start();
app.send('INITIALIZE');
```

_Note: This is just an example, you can invoke however you want._

## Messages

The `offline` machine sends out
