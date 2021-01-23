import { assign, Machine, sendParent } from 'xstate';

interface Navigator {
  onLine: boolean;
}

type EventListenerCallbackType = () => void;

interface AddEventListener {
  (event: string, callback: EventListenerCallbackType): void;
}

interface windowObj {
  addEventListener: AddEventListener;
}

interface BuildOfflineMachineParams {
  statusOnlineEventName: string;
  statusOfflineEventName: string;
  windowNavigator: Navigator;
}

/**
 * Pass in navigator so we can test it properly.
 *
 * @param statusOnlineEventName
 * @param statusOfflineEventName
 * @param windowNavigator
 * @returns {{initial: string, context: {isForcedOffline: boolean}, id: string, states: {offline: {entry: SendAction<unknown, EventObject, string>, invoke: {src: string, id: string}, on: {UNDO_FORCE_OFFLINE: [{cond: function(*): *, actions: [AssignAction<{isForcedOffline: boolean}, EventObject>], target: string}, {cond: function(*): *, actions: [AssignAction<{isForcedOffline: boolean}, EventObject>], target: string}], ONLINE: {cond: (function(*): boolean), target: string}}}, online: {entry: SendAction<unknown, EventObject, string>, invoke: {src: string, id: string}, on: {OFFLINE: string}}}, on: {FORCE_OFFLINE: {actions: AssignAction<{isForcedOffline: boolean}, EventObject>, target: string}, OFFLINE_STATUS: [{cond: function(*, *, *): boolean, actions: SendAction<unknown, EventObject, string>}, {cond: function(*, *, *): boolean, actions: SendAction<unknown, EventObject, string>}]}}}
 */
export const buildOfflineMachine = ({
  statusOnlineEventName = 'STATUS_ONLINE',
  statusOfflineEventName = 'STATUS_OFFLINE',
  windowNavigator = navigator,
}) => ({
  id: 'offline',
  initial: 'offline',
  context: {
    isForcedOffline: false,
  },
  states: {
    offline: {
      entry: sendParent(statusOfflineEventName),
      invoke: {
        id: 'checkingIfOnline',
        src: 'offlineService',
      },
      on: {
        ONLINE: { target: 'online', cond: c => !c.isForcedOffline },
        UNDO_FORCE_OFFLINE: [
          {
            target: 'offline',
            actions: [assign({ isForcedOffline: false })],
            cond: c => !windowNavigator.onLine && c.isForcedOffline,
          },
          {
            target: 'online',
            actions: [assign({ isForcedOffline: false })],
            cond: c => windowNavigator.onLine && c.isForcedOffline,
          },
        ],
      },
    },
    online: {
      entry: sendParent(statusOnlineEventName),
      invoke: {
        id: 'checkingIfOffline',
        src: 'onlineService',
      },
      on: {
        OFFLINE: 'offline',
      },
    },
  },
  on: {
    FORCE_OFFLINE: {
      target: 'offline',
      actions: assign({
        isForcedOffline: true,
      }),
    },
    OFFLINE_STATUS: [
      {
        actions: sendParent(statusOnlineEventName),
        cond: (_, __, m) => m.state.value === 'online',
      },
      {
        actions: sendParent(statusOfflineEventName),
        cond: (_, __, m) => m.state.value === 'offline',
      },
    ],
  },
});

/**
 * Pass in windowNavigator and windowObj so we can test properly.
 *
 * @param windowNavigator
 * @param windowObj
 * @returns {{services: {onlineService: (function(): function(*): void), offlineService: (function(*): function(*): undefined)}}}
 */
export const buildOfflineMachineOptions = ({ windowNavigator = navigator, windowObj = window }) => ({
  services: {
    onlineService: () => callback => {
      if (windowObj) {
        // prettier-ignore
        windowObj.addEventListener('offline', () => { callback('OFFLINE') }, { once: true });
      }
    },
    offlineService: context => callback => {
      // Ensure that we are in sync with the current navigator status i.e on machine load
      // ( if we are not forced offline )
      if (!context.isForcedOffline && windowNavigator?.onLine) {
        callback('ONLINE');
        return;
      }

      if (windowObj) {
        // prettier-ignore
        windowObj.addEventListener('online', () => { callback('ONLINE') }, { once: true });
      }
    },
  },
});

const isOfflineMachine = Machine(buildOfflineMachine({}), buildOfflineMachineOptions({}));

export default isOfflineMachine;
