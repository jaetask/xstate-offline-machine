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

interface NotifyParent {
  type: string;
  isForcedOffline: boolean;
}

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
      entry: sendParent(
        ({ isForcedOffline }: OfflineContext): NotifyParent => ({ type: statusOfflineEventName, isForcedOffline })
      ),
      invoke: {
        id: 'checkingIfOnline',
        src: 'offlineService',
      },
      on: {
        INTERNAL_ONLINE: { target: 'online', cond: (c: OfflineContext) => !c.isForcedOffline },
        OFFLINE_FORCE_OFFLINE_UNDO: [
          {
            target: 'offline',
            actions: [assign({ isForcedOffline: false })],
            cond: ({ isForcedOffline }: OfflineContext) => !windowNavigator.onLine && isForcedOffline,
          },
          {
            target: 'online',
            actions: [assign({ isForcedOffline: false })],
            cond: ({ isForcedOffline }: OfflineContext) => windowNavigator.onLine && isForcedOffline,
          },
        ],
      },
    },
    online: {
      entry: sendParent(
        ({ isForcedOffline }: OfflineContext): NotifyParent => ({ type: statusOnlineEventName, isForcedOffline })
      ),
      invoke: {
        id: 'checkingIfOffline',
        src: 'onlineService',
      },
      on: {
        INTERNAL_OFFLINE: 'offline',
      },
    },
  },
  on: {
    OFFLINE_FORCE_OFFLINE: {
      target: 'offline',
      actions: assign({
        isForcedOffline: true,
      }),
    },
    OFFLINE_STATUS: [
      {
        actions: sendParent(
          ({ isForcedOffline }: OfflineContext): NotifyParent => ({ type: statusOnlineEventName, isForcedOffline })
        ),
        cond: (_: any, __: any, meta: MetaStateValue) => meta?.state?.value === 'online',
      },
      {
        actions: sendParent(
          ({ isForcedOffline }: OfflineContext): NotifyParent => ({ type: statusOfflineEventName, isForcedOffline })
        ),
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
        windowObj.addEventListener('offline', () => { callback('INTERNAL_OFFLINE') }, { once: true });
      }
    },
    offlineService: (context: OfflineContext) => (callback: any) => {
      // Ensure that we are in sync with the current navigator status i.e on machine load
      // ( if we are not forced offline )
      if (!context.isForcedOffline && windowNavigator?.onLine) {
        callback('INTERNAL_ONLINE');
        return;
      }

      if (windowObj) {
        // prettier-ignore
        windowObj.addEventListener('online', () => { callback('INTERNAL_ONLINE') }, { once: true });
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
  | { type: 'INTERNAL_OFFLINE' }
  | { type: 'INTERNAL_ONLINE' }
  | { type: 'OFFLINE_FORCE_OFFLINE_UNDO' }
  | { type: 'OFFLINE_FORCE_OFFLINE' }
  | { type: 'OFFLINE_STATUS' };

const isOfflineMachine = Machine<OfflineContext, OfflineStateSchema, OfflineEvent>(
  buildOfflineMachine({}),
  buildOfflineMachineOptions({})
);

export default isOfflineMachine;
