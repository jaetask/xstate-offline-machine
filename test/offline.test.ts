import { Machine } from 'xstate';
import { buildOfflineMachine, buildOfflineMachineOptions } from '../src/index';

// JEST JSDOM testing rabbit hole! 😓
// const events = require('events');
// const window = new events.EventEmitter();

describe('offline', () => {
  it.skip('is in offline state by default', () => {
    const machineConfig = buildOfflineMachine({});
    const machine = Machine(machineConfig, buildOfflineMachineOptions({}));
    let state = machine.transition(machine.initialState, 'FAKE_EVENT');
    expect(state.value).toEqual('offline');
  });
  it.skip('initialise to online if navigator is online', () => {
    Object.assign(navigator, {
      onLine: true,
    });
    const machineConfig = buildOfflineMachine({ windowNavigator: navigator });
    const machine = Machine(machineConfig, buildOfflineMachineOptions({}));
    let state = machine.transition(machine.initialState, 'OFFLINE_STATUS');
    expect(state.value).toEqual('online');
  });
});
