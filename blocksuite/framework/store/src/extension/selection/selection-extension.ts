import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';
import { Slot } from '@blocksuite/global/utils';
import { computed, signal } from '@preact/signals-core';

import type { Store } from '../../model';
import { nanoid } from '../../utils/id-generator';
import type { StackItem } from '../../yjs';
import { StoreExtension } from '../store-extension';
import type { BaseSelection } from './base';
import { SelectionIdentifier } from './identifier';
import type { SelectionConstructor } from './types';

export class StoreSelectionExtension extends StoreExtension {
  static override readonly key = 'selection';

  private readonly _id = `${this.store.id}:${nanoid()}`;
  private _selectionConstructors: Record<string, SelectionConstructor> = {};
  private readonly _selections$ = signal<BaseSelection[]>([]);
  private readonly _remoteSelections$ = signal<Map<number, BaseSelection[]>>(
    new Map()
  );

  private readonly _itemAdded = (event: { stackItem: StackItem }) => {
    event.stackItem.meta.set('selection-state', this.value);
  };

  private readonly _itemPopped = (event: { stackItem: StackItem }) => {
    const selection = event.stackItem.meta.get('selection-state');
    if (selection) {
      this.set(selection as BaseSelection[]);
    }
  };

  private readonly _jsonToSelection = (json: Record<string, unknown>) => {
    const ctor = this._selectionConstructors[json.type as string];
    if (!ctor) {
      throw new BlockSuiteError(
        ErrorCode.SelectionError,
        `Unknown selection type: ${json.type}`
      );
    }
    return ctor.fromJSON(json);
  };

  slots = {
    changed: new Slot<BaseSelection[]>(),
    remoteChanged: new Slot<Map<number, BaseSelection[]>>(),
  };

  constructor(store: Store) {
    super(store);

    this.store.provider.getAll(SelectionIdentifier).forEach(ctor => {
      [ctor].flat().forEach(ctor => {
        this._selectionConstructors[ctor.type] = ctor;
      });
    });

    this.store.awarenessStore.awareness.on(
      'change',
      (change: { updated: number[]; added: number[]; removed: number[] }) => {
        const all = change.updated.concat(change.added).concat(change.removed);
        const localClientID = this.store.awarenessStore.awareness.clientID;
        const exceptLocal = all.filter(id => id !== localClientID);

        // Only consider remote selections from other clients
        if (exceptLocal.length === 0) return;

        const map = new Map<number, BaseSelection[]>();
        Array.from(this.store.awarenessStore.getStates().entries())
          .filter(([id]) => id !== localClientID)
          .forEach(([id, state]) => {
            // selection id starts with the same block collection id from others clients would be considered as remote selections
            const selection = Object.entries(state.selectionV2)
              .filter(([key]) => key.startsWith(this.store.id))
              .flatMap(([_, selection]) => selection);

            const selections = selection
              .map(json => {
                try {
                  return this._jsonToSelection(json);
                } catch (error) {
                  console.error(
                    'Parse remote selection failed:',
                    id,
                    json,
                    error
                  );
                  return null;
                }
              })
              .filter((sel): sel is BaseSelection => !!sel);

            map.set(id, selections);
          });
        this._remoteSelections$.value = map;
        this.slots.remoteChanged.emit(map);
      }
    );

    this.store.history.on('stack-item-added', this._itemAdded);
    this.store.history.on('stack-item-popped', this._itemPopped);
  }

  get value() {
    return this._selections$.peek();
  }

  get remoteSelections() {
    return this._remoteSelections$.peek();
  }

  clear(types?: string[]) {
    if (types) {
      const values = this.value.filter(s => !types.includes(s.type));
      this.set(values);
    } else {
      this.set([]);
    }
  }

  create<T extends SelectionConstructor>(
    Type: T,
    ...args: ConstructorParameters<T>
  ): InstanceType<T> {
    return new Type(...args) as InstanceType<T>;
  }

  getGroup(group: string) {
    return this.value.filter(s => s.group === group);
  }

  filter<T extends SelectionConstructor>(type: T) {
    return this.filter$(type).peek();
  }

  filter$<T extends SelectionConstructor>(type: T) {
    return computed(() =>
      this._selections$.value.filter((s): s is InstanceType<T> => s.is(type))
    );
  }

  find<T extends SelectionConstructor>(
    type: T,
    predicate?: (s: InstanceType<T>) => boolean
  ) {
    return this.find$(type, predicate).peek();
  }

  find$<T extends SelectionConstructor>(
    type: T,
    predicate?: (s: InstanceType<T>) => boolean
  ) {
    return computed(() =>
      this.filter$(type).value.find(s => predicate?.(s) ?? true)
    );
  }

  set(selections: BaseSelection[]) {
    this.store.awarenessStore.setLocalSelection(
      this._id,
      selections.map(s => s.toJSON())
    );
    this._selections$.value = selections;
    this.slots.changed.emit(selections);
  }

  setGroup(group: string, selections: BaseSelection[]) {
    const current = this.value.filter(s => s.group !== group);
    this.set([...current, ...selections]);
  }

  update(fn: (currentSelections: BaseSelection[]) => BaseSelection[]) {
    const selections = fn(this.value);
    this.set(selections);
  }

  fromJSON(json: Record<string, unknown>[]) {
    const selections = json.map(json => this._jsonToSelection(json));
    return this.set(selections);
  }
}
