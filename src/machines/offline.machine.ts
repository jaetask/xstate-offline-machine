import { assign, Machine, sendParent } from 'xstate';

interface Navigator {
  onLine: boolean;
}

type EventListenerCallbackType = () => void;

interface AddEventListener {
  (event: string, callback: EventListenerCallbackType, options?: { once: boolean }): void;
}

interface Window {
  addEventListener: AddEventListener;
}

interface BuildOfflineMachineParams {
  statusOnlineEventName?: string;
  statusOfflineEventName?: string;
  windowNavigator?: Navigator;
}

type BuildOfflineMachineType = (config: BuildOfflineMachineParams) => any;

export const buildOfflineMachine: BuildOfflineMachineType = ({
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
        ONLINE: { target: 'online', cond: (c: OfflineContext) => !c.isForcedOffline },
        UNDO_FORCE_OFFLINE: [
          {
            target: 'offline',
            actions: [assign({ isForcedOffline: false })],
            cond: (c: OfflineContext) => !windowNavigator.onLine && c.isForcedOffline,
          },
          {
            target: 'online',
            actions: [assign({ isForcedOffline: false })],
            cond: (c: OfflineContext) => windowNavigator.onLine && c.isForcedOffline,
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
        cond: (_: any, __: any, meta: MetaStateValue) => meta?.state?.value === 'online',
      },
      {
        actions: sendParent(statusOfflineEventName),
        cond: (_: any, __: any, meta: MetaStateValue) => meta?.state?.value === 'offline',
      },
    ],
  },
});

interface MetaStateValue {
  state?: {
    value?: string;
  };
}

interface BuildOfflineMachineOptionsParams {
  windowNavigator?: Navigator;
  windowObj?: Window;
}

type BuildOfflineMachineOptionsType = (config: BuildOfflineMachineOptionsParams) => any;

export const buildOfflineMachineOptions: BuildOfflineMachineOptionsType = ({
  windowNavigator = navigator,
  windowObj = window,
}) => ({
  services: {
    onlineService: () => (callback: any) => {
      if (windowObj) {
        // prettier-ignore
        windowObj.addEventListener('offline', () => { callback('OFFLINE') }, { once: true });
      }
    },
    offlineService: (context: OfflineContext) => (callback: any) => {
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

interface OfflineStateSchema {
  states: {
    offline: {};
    online: {};
  };
}

interface OfflineContext {
  isForcedOffline: boolean;
}

type OfflineEvent =
  | { type: 'OFFLINE' }
  | { type: 'ONLINE' }
  | { type: 'UNDO_FORCE_OFFLINE' }
  | { type: 'FORCE_OFFLINE' }
  | { type: 'OFFLINE_STATUS' };

const isOfflineMachine = Machine<OfflineContext, OfflineStateSchema, OfflineEvent>(
  buildOfflineMachine({}),
  buildOfflineMachineOptions({})
);

export default isOfflineMachine;
