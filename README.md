# JS Open Serialization Scheme (JOSS)

Serialize JavaScript data in an open binary format to seamlessly exchange structured data between JavaScript runtime environments.
Compatible with browsers, Deno, and Node.
* Serializes almost every intrinsic JavaScript data type and data structure, including those not native to JSON, such as ArrayBuffer, BigInt, Date, Map, RegExp, Set, Temporal, and TypedArray.
* Serializes primitive wrapper objects, sparse arrays, signed zeros, and circular references.
* Supports serializing to readable streams.

> **Note about Temporal**\
> Support for Temporal was included in release 1.1.1, but support in JavaScript runtime environments is patchy. As at May 2025, Firefox is the only browser to support Temporal by default. To try it in Node, be sure to include the `--harmony-temporal` flag. To try it in Deno, include the `--unstable-temporal` flag.

# Downloads

| Type | Environment | Filename |
| :--- | :--- | :--- |
| ES module | Browsers, Deno, Node | [joss.min.js](https://github.com/quantirisk/joss/raw/main/joss.min.js) |
| ES module (mjs extension) | Node | [joss.min.mjs](https://github.com/quantirisk/joss/raw/main/joss.min.mjs) |

This project is licensed under the [MIT License](LICENSE.md).
The CommonJS and IIFE versions are no longer maintained, but can always be found in [release 1.0.3](https://github.com/quantirisk/joss/releases/tag/1.0.3).


# Methods
Use the [`serialize`](#serializedata-options) and [`deserialize`](#deserializebytes) methods for serializations in the form of static data.
Use the [`serializable`](#serializabledata-options) and [`deserializable`](#deserializableoptions) methods for serializations in the form of readable streams.
Use the [`deserializing`](#deserializingreadable-options) method for an alternative way to deserialize readable streams.

## serialize(data, [options])
* **data** `<any>`\
  The data to be serialized.
* **options** `<Object>`\
  An optional object that includes the following properties:
    * **endian** `<string>`\
      The endianness of TypedArrays in the serialization. Accepted values are `"LE"` for little-endian and `"BE"` for big-endian. If the source and target machines have different endianness, setting this property to the endianness of the slower machine ensures that the swapping of byte orderings happens on the faster machine. Defaults to the endianness of the source machine.
* **Returns** `<Uint8Array>`\
  The serialized bytes.


## deserialize(bytes)
* **bytes** `<Uint8Array>`\
  The serialized bytes.
* **Returns** `<any>`\
  The deserialized data.


## serializable(data, [options])
* **data** `<any>`\
  The data to be serialized.
* **options** `<Object>`\
  See the options parameter for `serialize`.
* **Returns** `<ReadableStream>`\
  A readable stream from which the serialized bytes can be read.


## deserializable([options])
* **options** `<Object>`\
  An optional object that includes the following properties:
  * **maxlength** `<number>`\
    The maximum acceptable length of the serialized bytes. Must be a positive integer. Defaults to 1GB.
* **Returns** `<WritableStream>`\
  A writable stream to which the serialized bytes can be written.
  After the writing process has completed successfully, the deserialized data can be accessed from the custom **`result`** property.


## deserializing(readable, [options])
* **readable** `<ReadableStream>` | `<AsyncIterable>`\
  A readable stream or async iterable object from which the serialized bytes can be read.
* **options** `<Object>`\
  See the options parameter for `deserializable`.
* **Returns** `<Promise>`\
  A promise that resolves to the deserialized data.


# Examples

## Fetch API
The following is an example of a HTTP request made using the `Fetch API` from a browser.
The example covers all 5 serialization and deserialization methods.
```javascript
  import * as JOSS from "/path/to/joss.min.js";
  const data = { foo : { bar: "baz" } };
  const options = { method: "POST", headers: { "Content-Type": "application/octet-stream" } };
  if (new Request("", {method: "POST", body: new ReadableStream()}).headers.has("Content-Type")) {
    options.body = JOSS.serialize(data);                     // Call serialize
  } else {
    options.body = JOSS.serializable(data);                  // Call serializable
  }
  fetch("/path/to/resource", options).then(async function(response) {
    if (response.body === undefined) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const data = JOSS.deserialize(bytes);                  // Call deserialize
    } else if (response.body.pipeTo === undefined) {
      const data = await JOSS.deserializing(response.body);  // Call deserializing
    } else {
      const writable = JOSS.deserializable();                // Call deserializable
      await response.body.pipeTo(writable);
      const data = writable.result;
    }
  });
```

The option to assign a `ReadableStream` to the body of a `Fetch` request is available only in Chromium-based browsers at the time of writing.
It can be enabled by navigating to `chrome://flags` and activating the `enable-experimental-web-platform-features` flag.
Please see [this page](https://web.dev/fetch-upload-streaming/#feature-detection) for more information about request streams.

## Deno HTTP Server
The following is an example of a HTTP server in Deno (tested in v2.3.3).
Incoming data is deserialized using the [`deserializing`](#deserializingreadable-options) method.
Outgoing data is serialized using the [`serializable`](#serializabledata-options) method.
```javascript
  import { serializable, deserializing } from "/path/to/joss.min.js";
  Deno.serve({ hostname: "127.0.0.1", port: 8080 }, async (request) => {
    let data = await deserializing(request.body);  // Call deserializing
    // ...
    return new Response(serializable(data));       // Call serializable
  });
```


## Node HTTP Server
The following is an example of a HTTP server in Node (tested in v22.16.0).
Incoming data is deserialized using the [`deserializing`](#deserializingreadable-options) method.
Outgoing data is serialized using the [`serializable`](#serializabledata-options) method.
```javascript
  import { serializable, deserializing } from "/path/to/joss.min.js";
  import { createServer } from "node:http";
  import { Writable } from "node:stream";
  createServer(async (request, response) => {
    let data = await deserializing(request);       // Call deserializing
    // ...
    const readable = serializable(data);           // Call serializable
    const writable = Writable.toWeb(response);     // Convert response from a stream.Writable
    await readable.pipeTo(writable);               // to a WritableStream for pipeTo() to work
    response.end();
  }).listen(8080, "127.0.0.1");
```


# Supported Types
The serialization format supports the following data types and data structures:
* `null`
* `undefined`
* `Boolean` (including primitive wrapper object)
* `BigInt` (including primitive wrapper object)
* `Number` (including primitive wrapper object, `Infinity`, `-Infinity`, `NaN`, and `-0`)
* `String` (including primitive wrapper object)
* `ArrayBuffer`
* `SharedArrayBuffer`
* `TypedArray` (including `Float16Array`)
* `Temporal`
* `DataView`
* `Array` (dense and sparse)
* `Object`
* `Map`
* `Set`
* `Date`
* `RegExp`
* Object references
* Custom objects

Please see the [official specification](SPECS.md) for details.
