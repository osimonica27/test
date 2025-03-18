[**@blocksuite/store**](../../../@blocksuite/store/README.md)

***

[BlockSuite API Documentation](../../../README.md) / [@blocksuite/store](../README.md) / Store

# Class: Store

Core store class that manages blocks and their lifecycle in BlockSuite

## Remarks

The Store class is responsible for managing the lifecycle of blocks, handling transactions,
and maintaining the block tree structure.
A store is a piece of data created from one or a part of a Y.Doc.

## Block CRUD

### updateBlock()

> **updateBlock**: \<`T`\>(`model`, `props`) => `void`(`model`, `callback`) => `void`

Updates a block's properties or executes a callback in a transaction

#### Type Parameters

##### T

`T` *extends* `Partial`\<`BlockProps`\>

#### Parameters

##### model

`string` | `BlockModel`\<`object`\>

##### props

`T`

#### Returns

`void`

#### Parameters

##### model

`string` | `BlockModel`\<`object`\>

##### callback

() => `void`

#### Returns

`void`

#### Param

The block model or block ID to update

#### Param

Either a callback function to execute or properties to update

#### Throws

When the block is not found or schema validation fails

***

### blockSize

#### Get Signature

> **get** **blockSize**(): `number`

Get the number of blocks in the store

##### Returns

`number`

***

### addBlock()

> **addBlock**(`flavour`, `blockProps`, `parent`?, `parentIndex`?): `string`

Creates and adds a new block to the store

#### Parameters

##### flavour

`string`

The block's flavour (type)

##### blockProps

`Partial`\<`BlockSysProps` & `Record`\<`string`, `unknown`\> & `Omit`\<`BlockProps`, `"flavour"`\>\> = `{}`

Optional properties for the new block

##### parent?

Optional parent block or parent block ID

`null` | `string` | `BlockModel`\<`object`\>

##### parentIndex?

`number`

Optional index position in parent's children

#### Returns

`string`

The ID of the newly created block

#### Throws

When store is in readonly mode

***

### addBlocks()

> **addBlocks**(`blocks`, `parent`?, `parentIndex`?): `string`[]

Add multiple blocks to the store

#### Parameters

##### blocks

`object`[]

Array of blocks to add

##### parent?

Optional parent block or parent block ID

`null` | `string` | `BlockModel`\<`object`\>

##### parentIndex?

`number`

Optional index position in parent's children

#### Returns

`string`[]

Array of IDs of the newly created blocks

***

### addSiblingBlocks()

> **addSiblingBlocks**(`targetModel`, `props`, `place`): `string`[]

Add sibling blocks to the store

#### Parameters

##### targetModel

`BlockModel`

The target block model

##### props

`Partial`\<`BlockProps`\>[]

Array of block properties

##### place

Optional position to place the new blocks ('after' or 'before')

`"after"` | `"before"`

#### Returns

`string`[]

Array of IDs of the newly created blocks

***

### deleteBlock()

> **deleteBlock**(`model`, `options`): `void`

Delete a block from the store

#### Parameters

##### model

The block model or block ID to delete

`string` | `BlockModel`\<`object`\>

##### options

Optional options for the deletion

###### bringChildrenTo?

`BlockModel`\<`object`\>

Optional block model to bring children to

###### deleteChildren?

`boolean`

Optional flag to delete children

#### Returns

`void`

***

### getAllModels()

> **getAllModels**(): `BlockModel`\<`object`\>[]

Get all models in the store

#### Returns

`BlockModel`\<`object`\>[]

Array of all models

***

### getBlock()

> **getBlock**(`id`): `undefined` \| `Block`

Gets a block by its ID

#### Parameters

##### id

`string`

The block's ID

#### Returns

`undefined` \| `Block`

The block instance if found, undefined otherwise

***

### getBlock$()

> **getBlock$**(`id`): `undefined` \| `Block`

Gets a block by its ID

#### Parameters

##### id

`string`

The block's ID

#### Returns

`undefined` \| `Block`

The block instance in signal if found, undefined otherwise

***

### getBlocksByFlavour()

> **getBlocksByFlavour**(`blockFlavour`): `Block`[]

Gets all blocks of specified flavour(s)

#### Parameters

##### blockFlavour

Single flavour or array of flavours to filter by

`string` | `string`[]

#### Returns

`Block`[]

Array of matching blocks

***

### getModelById()

> **getModelById**\<`Model`\>(`id`): `null` \| `Model`

Get a model by its ID

#### Type Parameters

##### Model

`Model` *extends* `BlockModel`\<`object`\> = `BlockModel`\<`object`\>

#### Parameters

##### id

`string`

The model's ID

#### Returns

`null` \| `Model`

The model instance if found, null otherwise

***

### getModelsByFlavour()

> **getModelsByFlavour**(`blockFlavour`): `BlockModel`\<`object`\>[]

Get all models of specified flavour(s)

#### Parameters

##### blockFlavour

Single flavour or array of flavours to filter by

`string` | `string`[]

#### Returns

`BlockModel`\<`object`\>[]

Array of matching models

***

### getNext()

> **getNext**(`block`): `null` \| `BlockModel`\<`object`\>

Get the next sibling block of a given block

#### Parameters

##### block

Block model or block ID to find next sibling for

`string` | `BlockModel`\<`object`\>

#### Returns

`null` \| `BlockModel`\<`object`\>

The next sibling block model if found, null otherwise

***

### getNexts()

> **getNexts**(`block`): `BlockModel`\<`object`\>[]

Get all next sibling blocks of a given block

#### Parameters

##### block

Block model or block ID to find next siblings for

`string` | `BlockModel`\<`object`\>

#### Returns

`BlockModel`\<`object`\>[]

Array of next sibling blocks if found, empty array otherwise

***

### getParent()

> **getParent**(`target`): `null` \| `BlockModel`\<`object`\>

Gets the parent block of a given block

#### Parameters

##### target

Block model or block ID to find parent for

`string` | `BlockModel`\<`object`\>

#### Returns

`null` \| `BlockModel`\<`object`\>

The parent block model if found, null otherwise

***

### getPrev()

> **getPrev**(`block`): `null` \| `BlockModel`\<`object`\>

Get the previous sibling block of a given block

#### Parameters

##### block

Block model or block ID to find previous sibling for

`string` | `BlockModel`\<`object`\>

#### Returns

`null` \| `BlockModel`\<`object`\>

The previous sibling block model if found, null otherwise

***

### getPrevs()

> **getPrevs**(`block`): `BlockModel`\<`object`\>[]

Get all previous sibling blocks of a given block

#### Parameters

##### block

Block model or block ID to find previous siblings for

`string` | `BlockModel`\<`object`\>

#### Returns

`BlockModel`\<`object`\>[]

Array of previous sibling blocks if found, empty array otherwise

***

### hasBlock()

> **hasBlock**(`id`): `boolean`

Check if a block exists by its ID

#### Parameters

##### id

`string`

The block's ID

#### Returns

`boolean`

True if the block exists, false otherwise

***

### moveBlocks()

> **moveBlocks**(`blocksToMove`, `newParent`, `targetSibling`, `shouldInsertBeforeSibling`): `void`

Move blocks to a new parent block

#### Parameters

##### blocksToMove

`BlockModel`\<`object`\>[]

Array of block models to move

##### newParent

`BlockModel`

The new parent block model

##### targetSibling

Optional target sibling block model

`null` | `BlockModel`\<`object`\>

##### shouldInsertBeforeSibling

`boolean` = `true`

Optional flag to insert before sibling

#### Returns

`void`

## Store Lifecycle

### disposableGroup

> **disposableGroup**: `DisposableGroup`

Group of disposable resources managed by the store

***

### slots

> `readonly` **slots**: `object` & `object`

Slots for receiving events from the store.

#### Type declaration

##### historyUpdated

> **historyUpdated**: `Subject`\<`void`\>

This fires when the doc history is updated.

##### yBlockUpdated

> **yBlockUpdated**: `Subject`\<\{ `id`: `string`; `isLocal`: `boolean`; `type`: `"add"`; \} \| \{ `id`: `string`; `isLocal`: `boolean`; `type`: `"delete"`; \}\>

This fires when the doc yBlock is updated.

#### Type declaration

##### blockUpdated

> **blockUpdated**: `Subject`\<`BlockUpdatedPayload`\>

This fires when a block is updated via API call or has just been updated from existing ydoc.

##### ready

> **ready**: `Subject`\<`void`\>

This is always triggered after `doc.load` is called.

##### rootAdded

> **rootAdded**: `Subject`\<`string`\>

This fires when the root block is added via API call or has just been initialized from existing ydoc.
useful for internal block UI components to start subscribing following up events.
Note that at this moment, the whole block tree may not be fully initialized yet.

##### rootDeleted

> **rootDeleted**: `Subject`\<`string`\>

This fires when the root block is deleted via API call or has just been removed from existing ydoc.

***

### dispose()

> **dispose**(): `void`

Disposes the store and releases all resources

#### Returns

`void`

***

### load()

> **load**(`initFn`?): `Store`

Initializes and loads the store

#### Parameters

##### initFn?

() => `void`

Optional initialization function

#### Returns

`Store`

The store instance

## Transformer

### getTransformer()

> **getTransformer**(`middlewares`): `Transformer`

Creates a new transformer instance for the store

#### Parameters

##### middlewares

`TransformerMiddleware`[] = `[]`

Optional array of transformer middlewares

#### Returns

`Transformer`

A new Transformer instance

## Other

### awarenessStore

#### Get Signature

> **get** **awarenessStore**(): `AwarenessStore`

Get the AwarenessStore instance for current store

##### Returns

`AwarenessStore`

***

### blobSync

#### Get Signature

> **get** **blobSync**(): `BlobEngine`

Get the BlobEngine instance for current store.

##### Returns

`BlobEngine`

***

### doc

#### Get Signature

> **get** **doc**(): `Doc`

Get the Doc instance for current store.

##### Returns

`Doc`

***

### get

#### Get Signature

> **get** **get**(): \<`T`\>(`identifier`, `options`?) => `T`

Get an extension instance from the store

##### Example

```ts
const extension = store.get(SomeExtension);
```

##### Returns

`Function`

The extension instance

###### Type Parameters

###### T

`T`

###### Parameters

###### identifier

`GeneralServiceIdentifier`\<`T`\>

###### options?

`ResolveOptions`

###### Returns

`T`

***

### getOptional

#### Get Signature

> **get** **getOptional**(): \<`T`\>(`identifier`, `options`?) => `null` \| `T`

Optional get an extension instance from the store.
The major difference between `get` and `getOptional` is that `getOptional` will not throw an error if the extension is not found.

##### Example

```ts
const extension = store.getOptional(SomeExtension);
```

##### Returns

`Function`

The extension instance

###### Type Parameters

###### T

`T`

###### Parameters

###### identifier

`GeneralServiceIdentifier`\<`T`\>

###### options?

`ResolveOptions`

###### Returns

`null` \| `T`

***

### provider

#### Get Signature

> **get** **provider**(): `ServiceProvider`

Get the di provider for current store.

##### Returns

`ServiceProvider`
