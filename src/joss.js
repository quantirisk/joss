// Copyright (c) 2021 Quantitative Risk Solutions PLT (201604001668)
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// 
  "use strict";
  const endian = getEndianness();
  const encoders = {
    "Object": encodeCollect,
    "Array": encodeCollect,
    "Map": encodeCollect,
    "Set": encodeCollect,
    "DataView": encodeTypedArray,
    "Int8Array": encodeTypedArray,
    "Uint8Array": encodeTypedArray,
    "Uint8ClampedArray": encodeTypedArray,
    "Int16Array": encodeTypedArray,
    "Uint16Array": encodeTypedArray,
    "Int32Array": encodeTypedArray,
    "Uint32Array": encodeTypedArray,
    "Float32Array": encodeTypedArray,
    "Float64Array": encodeTypedArray,
    "BigInt64Array": encodeTypedArray,
    "BigUint64Array": encodeTypedArray,
    "Date": encodeDate,
    "RegExp": encodeRegExp,
    "ArrayBuffer": encodeString,
    "SharedArrayBuffer": encodeString,
    "Boolean": encodeBoolean,
    "Number": encodeNumber,
    "BigInt": encodeBigInt,
    "String": encodeString
  };
  const errors = {
    hole: new Error("Encountered a hole in a sparse array"),
    ended: new Error("The serialized bytestream ended before the deserialization could complete successfully."),
    unused: new Error("The deserialization completed before the end of the serialized bytestream."),
    exceeded: new Error("The serialized bytestream exceeded the maximum acceptable length."),
    malformed: new Error("The serialized bytestream contained malformed byte sequences."),
    property: new Error("Encountered an undefined property of a collection."),
    collection: new Error("Encountered a collection in streaming mode.")
  };
  errors.ended.name = "ERR_ENDED";
  errors.unused.name = "ERR_UNUSED";
  errors.exceeded.name = "ERR_EXCEEDED";
  errors.malformed.name = "ERR_MALFORMED";
  export {
    encodeStatic as serialize,
    decodeStatic as deserialize,
    encodeStream as serializable,
    decodeStream as deserializable,
    decodeAsync as deserializing
  };
  function encodeStatic(input, options) {
    const output = {};
    if (options === undefined) {
      options = {};
    } else if (typeof options !== "object") {
      throw new TypeError("The options parameter must be an object.");
    }
    if (options.hasOwnProperty("endian") === false) {
      output.endian = endian;
    } else if (options.endian === "LE" || options.endian === "BE") {
      output.endian = options.endian;
    } else {
      throw new RangeError("The endian option must be either \"LE\" or \"BE\".");
    }
    output.bytes = [];
    output.length = 0;
    output.record = new Map();
    output.method = "static";
    encodeData(output, input);
    return concatBytes(output.bytes, output.length);
  }
  function encodeData(output, input) {
    switch (typeof input) {
      case "object":
        if (input !== null) {
          const name = input.constructor.name;
          const encoder = encoders[name];
          if (encoder !== undefined) {
            if (output.record.has(input) === false) {
              output.record.set(input, output.length);
              return encoder(output, input, name);
            } else {
              return encodeReference(output, input);
            }
          } else {
            return appendBytes(output, Uint8Array.of(13));
          }
        } else {
          return appendBytes(output, Uint8Array.of(0));
        }
      case "undefined": return appendBytes(output, Uint8Array.of(1));
      case "boolean": return encodeBoolean(output, input);
      case "number": return encodeNumber(output, input);
      case "bigint": return encodeBigInt(output, input);
      case "string": return encodeString(output, input);
      default: appendBytes(output, Uint8Array.of(13));
    }
  }
  function encodeBoolean(output, input, name) {
    if (name === undefined) {
      if (input === true) {
        appendBytes(output, Uint8Array.of(2));
      } else {
        appendBytes(output, Uint8Array.of(4));
      }
    } else {
      if (input.valueOf() === true) {
        appendBytes(output, Uint8Array.of(3));
      } else {
        appendBytes(output, Uint8Array.of(5));
      }
    }
  }
  function encodeNumber(output, input, name) {
    let byte;
    let data;
    let value;
    byte = 1 << 5;
    if (name === undefined) {
      value = input;
      if (isFinite(value)) {
      } else if (value === Infinity) {
        return appendBytes(output, Uint8Array.of(6));
      } else if (value === -Infinity) {
        return appendBytes(output, Uint8Array.of(8));
      } else {
        return appendBytes(output, Uint8Array.of(10));
      }
    } else {
      value = input.valueOf();
      if (isFinite(value)) {
        byte |= 1 << 4;
      } else if (value === Infinity) {
        return appendBytes(output, Uint8Array.of(7));
      } else if (value === -Infinity) {
        return appendBytes(output, Uint8Array.of(9));
      } else {
        return appendBytes(output, Uint8Array.of(11));
      }
    }
    if (Math.floor(value) === value && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      if (value < 0 || (value === 0 && 1/value === -Infinity)) byte |= 1 << 3;
      data = encodeUInt(Math.abs(value));
    } else {
      data = new Uint8Array(new ArrayBuffer(8));
      new DataView(data.buffer, data.byteOffset, data.byteOffset+data.length).setFloat64(0, value, true);
    }
    appendBytes(output, Uint8Array.of(byte | data.length-1));
    appendBytes(output, data);
  }
  function encodeBigInt(output, input, name) {
    let byte;
    let data;
    let value;
    byte = 2 << 5;
    if (name === undefined) {
      value = input;
    } else {
      value = input.valueOf();
      byte |= 1 << 4;
    }
    if (value >= 0) {
      data = encodeBigUInt(value);
    } else {
      byte |= 1 << 3;
      data = encodeBigUInt(-value);
    }
    const size = encodeUInt(data.length);
    appendBytes(output, Uint8Array.of(byte | size.length-1));
    appendBytes(output, size);
    appendBytes(output, data);
  }
  function encodeString(output, input, name, offset, length) {
    let byte;
    let data;
    byte = 3 << 5;
    if (name === undefined) {
      data = encodeUTF8(input);
    } else if (name === "String") {
      byte |= 1 << 3;
      data = encodeUTF8(input.valueOf());
    } else {
      if (name === "ArrayBuffer") {
        byte |= 2 << 3;
      } else {
        byte |= 3 << 3;
      }
      data = new Uint8Array(input, offset || 0, length || input.byteLength);
    }
    const size = encodeUInt(data.length);
    appendBytes(output, Uint8Array.of(byte | size.length-1));
    appendBytes(output, size);
    appendBytes(output, data);
  }
  function encodeCollect(output, input, name) {
    if (output.method === "stream") throw errors.collection;
    let byte;
    byte = 4 << 5;
    if (name === "Array") {
      const size1 = encodeUInt(input.length);
      const analysis = analyzeArray(input);
      if (analysis.nslot !== undefined) {
        byte = 5 << 5;
        const nslot = analysis.nslot;
        const size2 = encodeUInt(nslot);
        appendBytes(output, Uint8Array.of(byte | 0 << 4 | size1.length-1 << 2 | size2.length-1));
        appendBytes(output, size1);
        appendBytes(output, size2);
        for (let index = 0; index < nslot; index += 1) {
          if (input.hasOwnProperty(index)) {
            encodeData(output, input[index]);
          } else {
            appendBytes(output, Uint8Array.of(12));
          }
        }
      } else if (analysis.nelement !== undefined) {
        byte = 5 << 5;
        const size2 = encodeUInt(analysis.nelement);
        appendBytes(output, Uint8Array.of(byte | 1 << 4 | size1.length-1 << 2 | size2.length-1));
        appendBytes(output, size1);
        appendBytes(output, size2);
        input.forEach(function(element, index) {
          encodeData(output, index);
          encodeData(output, element);
        });
      } else {
        const size = encodeUInt(input.length);
        appendBytes(output, Uint8Array.of(byte | size1.length-1));
        appendBytes(output, size1);
        input.forEach(function(element) {
          encodeData(output, element);
        });
      }
    } else if (name === "Object") {
      const size = encodeUInt(Object.keys(input).length);
      appendBytes(output, Uint8Array.of(byte | 1 << 3 | size.length-1));
      appendBytes(output, size);
      for (let key in input) {
        if (input.hasOwnProperty(key)) {
          encodeData(output, key);
          encodeData(output, input[key]);
        }
      }
    } else if (name === "Map") {
      const size = encodeUInt(input.size);
      appendBytes(output, Uint8Array.of(byte | 2 << 3 | size.length-1));
      appendBytes(output, size);
      input.forEach(function(value, key) {
        encodeData(output, key);
        encodeData(output, value);
      });
    } else {
      const size = encodeUInt(input.size);
      appendBytes(output, Uint8Array.of(byte | 3 << 3 | size.length-1));
      appendBytes(output, size);
      input.forEach(function(value) {
        encodeData(output, value);
      });
    }
  }
  function encodeTypedArray(output, input, name) {
    let byte;
    let buffer;
    let offset;
    let length;
    byte = 6 << 5;
    if (output.endian === "BE") byte |= 1 << 4;
    if (output.endian !== endian && input.BYTES_PER_ELEMENT > 1) {
      buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
      switch (input.BYTES_PER_ELEMENT) {
        case 2: buffer = swap16(buffer); break;
        case 4: buffer = swap32(buffer); break;
        case 8: buffer = swap64(buffer); break;
      }
      offset = 0;
      length = buffer.byteLength;
    } else {
      buffer = input.buffer;
      offset = input.byteOffset;
      length = input.byteLength;
    }
    const names = ["DataView",
      "Int8Array", "Uint8Array", "Uint8ClampedArray",
      "Int16Array", "Uint16Array", "Int32Array", "Uint32Array",
      "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array"];
    appendBytes(output, Uint8Array.of(byte | names.indexOf(name)));
    if (output.record.has(buffer) === false) {
      output.record.set(buffer, output.length);
      encodeString(output, buffer, buffer.constructor.name, offset, length);
    } else {
      encodeReference(output, buffer);
    }
  }
  function encodeDate(output, input) {
    appendBytes(output, Uint8Array.of(14));
    encodeData(output, input.valueOf());
  }
  function encodeRegExp(output, input) {
    appendBytes(output, Uint8Array.of(15));
    encodeData(output, input.toString());
  }
  function encodeReference(output, input) {
    appendBytes(output, Uint8Array.of(29));
    encodeNumber(output, output.record.get(input));
  }
  function encodeUInt(integer) {
    const bytes = [];
    while (integer > 255) {
      bytes.push(integer & 255);
      integer = Math.floor(integer / 256);
    }
    bytes.push(integer);
    return Uint8Array.from(bytes);
  }
  function encodeBigUInt(integer) {
    const bytes = [];
    const big8 = BigInt(8);
    const big255 = BigInt(255);
    while (integer > big255) {
      bytes.push(Number(integer & big255));
      integer = integer >> big8;
    }
    bytes.push(Number(integer));
    return Uint8Array.from(bytes);
  }
  function encodeUTF8(string) {
    try {
      return new TextEncoder().encode(string);
    } catch(error) {
      let i = 0;
      const data = [];
      const n = string.length;
      while (i < n) {
        let code = string.charCodeAt(i++);
        if (code <= 0x7F) {
          data.push(code);
        } else if (code <= 0x07FF) {
          data.push((code>>6 & 0x1F) | 0xC0);
          data.push((code & 0x3F) | 0x80);
        } else if (code <= 0xD7FF || (code >= 0xE000 && code <= 0xFFFF)) {
          data.push((code>>12 & 0x0F) | 0xE0);
          data.push((code>>6 & 0x3F) | 0x80);
          data.push((code & 0x3F) | 0x80);
        } else {
          const upper = code;
          const lower = string.charCodeAt(i++);
          if (upper < 0xD800 || upper > 0xDBFF) continue;
          if (lower < 0xDC00 || lower > 0xDFFF) continue;
          code = (upper & 0x3FF)<<10
               | (lower & 0x3FF);
          code += 0x10000;
          data.push((code>>18 & 0x07) | 0xF0);
          data.push((code>>12 & 0x3F) | 0x80);
          data.push((code>>6 & 0x3F) | 0x80);
          data.push((code & 0x3F) | 0x80);
        }
      }
      return Uint8Array.from(data);
    }
  }
  function encodeStream(input, options) {
    const output = {};
    if (options === undefined) {
      options = {};
    } else if (typeof options !== "object") {
      throw new TypeError("The options parameter must be an object.");
    }
    if (options.hasOwnProperty("endian") === false) {
      output.endian = endian;
    } else if (options.endian === "LE" || options.endian === "BE") {
      output.endian = options.endian;
    } else {
      throw new RangeError("The endian option must be either \"LE\" or \"BE\".");
    }
    output.length = 0;
    output.record = new Map();
    output.method = "stream";

    const stages = [];
    const collects = [];
    const iterators = [];
    const $size = Symbol();
    const $nslot = Symbol();
    const $nelement = Symbol();
    return new ReadableStream({
      start: startEncoder,
      pull: encodeChunk
    });
    function startEncoder(controller) {
      stages.push(0);
      collects.push({root: input});
      iterators.push(iterate(collects[0]));
    }
    function encodeChunk(controller) {
      let m = 0;
      let n = collects.length-1;
      output.bytes = [];
      while (m < 16384 && n >= 0) {
        const l = output.length;
        const stage = stages[n];
        const collect = collects[n];
        const iterator = iterators[n];
        const iteration = iterator.next();
        if (stage === 0) {
          let byte;
          byte = 4 << 5;
          const name = collect.constructor.name;
          if (name === "Array") {
            const size1 = encodeUInt(collect.length);
            if (collect.hasOwnProperty($nslot)) {
              byte = 5 << 5;
              const size2 = encodeUInt(collect[$nslot]);
              appendBytes(output, Uint8Array.of(byte | 0 << 4 | size1.length-1 << 2 | size2.length-1));
              appendBytes(output, size1);
              appendBytes(output, size2);
            } else if (collect.hasOwnProperty($nelement)) {
              byte = 5 << 5;
              const size2 = encodeUInt(collect[$nelement]);
              appendBytes(output, Uint8Array.of(byte | 1 << 4 | size1.length-1 << 2 | size2.length-1));
              appendBytes(output, size1);
              appendBytes(output, size2);
            } else {
              const size = encodeUInt(collect.length);
              appendBytes(output, Uint8Array.of(byte | size1.length-1));
              appendBytes(output, size1);
            }
          } else if (name === "Object" && n !== 0) {
            const size = encodeUInt(collect[$size]);
            appendBytes(output, Uint8Array.of(byte | 1 << 3 | size.length-1));
            appendBytes(output, size);
          } else if (name === "Map") {
            const size = encodeUInt(collect.size);
            appendBytes(output, Uint8Array.of(byte | 2 << 3 | size.length-1));
            appendBytes(output, size);
          } else if (name === "Set") {
            const size = encodeUInt(collect.size);
            appendBytes(output, Uint8Array.of(byte | 3 << 3 | size.length-1));
            appendBytes(output, size);
          }
        }
        if (iteration.done === false) {
          if (stage !== 2) {
            const key = iteration.value;
            const name = collect.constructor.name;
            if (name === "Array" && collect.hasOwnProperty($nelement)) {
              encodeData(output, key);
            } else if (name === "Object" && n !== 0) {
              encodeData(output, key);
            } else if (name === "Map") {
              try {
                encodeData(output, key);
              } catch(error) {
                if (error === errors.collection) {
                  stages.push(0);
                  collects.push(key);
                  iterators.push(iterate(key));
                } else {
                  throw error;
                }
              }
            }
            stages[n] = 2;
          } else if (stage === 2) {
            const value = iteration.value;
            if (value !== errors.hole) {
              try {
                encodeData(output, value);
              } catch(error) {
                if (error === errors.collection) {
                  stages.push(0);
                  collects.push(value);
                  iterators.push(iterate(value));
                } else {
                  throw error;
                }
              }
            } else if (collect.hasOwnProperty($nslot)) {
              appendBytes(output, Uint8Array.of(12));
            }
            stages[n] = 1;
          }
        } else {
          delete collect[$nelement];
          delete collect[$nslot];
          delete collect[$size];
          stages.pop();
          collects.pop();
          iterators.pop();
        }
        m += output.length-l;
        n = collects.length-1;
      }
      if (output.bytes.length !== 0) {
        controller.enqueue(concatBytes(output.bytes));
      } else if (n >= 0) {
        this.pull(controller);
      } else {
        controller.close();
      }
    }
    function iterate(collect) {
      let key;
      let type;
      let index;
      let iterator;
      type = "key";
      const name = collect.constructor.name;
      if (name === "Array") {
        iterator = collect.keys();
        const analysis = analyzeArray(collect);
        if (analysis.nslot !== undefined) {
          Object.defineProperty(collect, $nslot, { configurable: true, value: analysis.nslot });
        } else if (analysis.nelement !== undefined) {
          Object.defineProperty(collect, $nelement, { configurable: true, value: analysis.nelement });
        }
      } else if (name === "Object") {
        iterator = Object.keys(collect);
        Object.defineProperty(collect, $size, { configurable: true, value: iterator.length });
        index = -1;
      } else if (name === "Map" || name === "Set") {
        iterator = collect.keys();
      }
      return { next: next };

      function next() {
        if (type === "key") {
          type = "value";
          if (index === undefined) {
            let iteration = iterator.next();
            if (collect.hasOwnProperty($nelement)) {
              while (collect.hasOwnProperty(iteration.value) === false && iteration.done === false) {
                iteration = iterator.next();
              }
            }
            if (iteration.done === false) {
              key = iteration.value;
              if (collect.hasOwnProperty($nslot) && key >= collect[$nslot]) {
                return { value: undefined, done: true };
              } else {
                return { value: key, done: false };
              }
            } else {
              return { value: undefined, done: true };
            }
          } else {
            index += 1;
            if (iterator[index] !== undefined) {
              key = iterator[index];
              return { value: key, done: false };
            } else {
              return { value: undefined, done: true };
            }
          }
        } else {
          type = "key";
          if (name === "Array") {
            if (collect.hasOwnProperty(key)) {
              return { value: collect[key], done: false };
            } else {
              return { value: errors.hole, done: false };
            }
          } else if (name === "Object") {
            return { value: collect[key], done: false };
          } else if (name === "Map") {
            return { value: collect.get(key), done: false };
          } else if (name === "Set") {
            return { value: key, done: false };
          }
        }
      }
    }
  }
  function decodeStatic(bytes) {
    if (typeof bytes !== "object" || bytes.constructor.name !== "Uint8Array") {
      throw new TypeError("The bytes parameter must be a Uint8Array.");
    }
    const input = {};
    input.map = new Map();
    input.bytes = bytes;
    input.cursor = 0;
    input.offset = 0;
    input.method = "static";
    const output = decodeData(input);
    if (input.cursor !== input.bytes.length) throw errors.unused;
    return output;
  }
  function decodeData(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) {
      throw errors.ended;
    } else if (byte <= 13) {
      let output;
      input.cursor++;
      input.offset++;
      switch (byte) {
        case 0:  return null;
        case 1:  return undefined; break;
        case 2:  return true;
        case 3:  output = new Boolean(true); break;
        case 4:  return false;
        case 5:  output = new Boolean(false); break;
        case 6:  return Infinity;
        case 7:  output = new Number(Infinity); break;
        case 8:  return -Infinity;
        case 9:  output = new Number(-Infinity); break;
        case 10: return NaN;
        case 11: output = new Number(NaN); break;
        case 12: return errors.hole;
        case 13: return new ReferenceError();
      }
      input.map.set(input.offset-1, output);
      return output;
    } else if (byte <= 31) {
      switch (byte) {
        case 14: return decodeDate(input);
        case 15: return decodeRegExp(input);
        case 29: return decodeReference(input);
        default: throw errors.malformed;
      }
    } else {
      switch (byte >> 5) {
        case 1: return decodeNumber(input);
        case 2: return decodeBigInt(input);
        case 3: return decodeString(input);
        case 4: return decodeCollect(input);
        case 5: return decodeSparseArray(input);
        case 6: return decodeTypedArray(input);
        case 7: throw errors.malformed;
      }
    }
  }
  function decodeNumber(input) {
    let output;
    let i = input.cursor;
    const byte = input.bytes[i++];
    const n = (byte & 7) + 1;
    if (i+n > input.bytes.length) throw errors.ended;
    if (n < 8) {
      if (n === 7 && input.bytes[i+6] > 31) throw errors.malformed;
      output = decodeUInt(input.bytes.subarray(i, i+=n));
      if ((byte >> 3 & 1) === 1) output *= -1;
    } else {
      const data = input.bytes.subarray(i, i+=n);
      output = new DataView(data.buffer, data.byteOffset, data.length).getFloat64(0, true);
    }
    if ((byte >> 4 & 1) === 1) {
      output = new Number(output);
      input.map.set(input.offset, output);
    }
    input.cursor += n+1;
    input.offset += n+1;
    return output;
  }
  function decodeBigInt(input) {
    let output;
    let i = input.cursor;
    const byte = input.bytes[i++];
    const m = (byte & 7) + 1;
    if (i+m > input.bytes.length) throw errors.ended;
    const n = decodeUInt(input.bytes.subarray(i, i+=m));
    if (i+n > input.bytes.length) throw errors.ended;
    output = decodeBigUInt(input.bytes.subarray(i, i+=n));
    if ((byte >> 3 & 1) === 1) output *= BigInt(-1);
    if ((byte >> 4 & 1) === 1) {
      output = new Object(output);
      input.map.set(input.offset, output);
    }
    input.cursor += m+n+1;
    input.offset += m+n+1;
    return output;
  }
  function decodeString(input) {
    let output;
    let i = input.cursor;
    const byte = input.bytes[i++];
    const m = (byte & 7) + 1;
    if (i+m > input.bytes.length) throw errors.ended;
    const n = decodeUInt(input.bytes.subarray(i, i+=m));
    if (i+n > input.bytes.length) throw errors.ended;
    switch (byte >> 3 & 3) {
      case 0:
        output = decodeUTF8(input.bytes, i, i+=n);
        break;
      case 1:
        output = new String(decodeUTF8(input.bytes, i, i+=n));
        input.map.set(input.offset, output);
        break;
      case 2:
        output = new ArrayBuffer(n);
        input.map.set(input.offset, output);
        new Uint8Array(output).set(input.bytes.subarray(i, i+=n));
        break;
      case 3:
        output = new SharedArrayBuffer(n);
        input.map.set(input.offset, output);
        new Uint8Array(output).set(input.bytes.subarray(i, i+=n));
    }
    input.cursor += m+n+1;
    input.offset += m+n+1;
    return output;
  }
  function decodeCollect(input) {
    if (input.method === "stream") throw errors.collection;
    let output;
    let i = input.cursor;
    const byte = input.bytes[i++];
    const l = input.bytes.length;
    const m = (byte & 7) + 1;
    if (i+m > l) throw errors.ended;
    const n = decodeUInt(input.bytes.subarray(i, i+=m));
    switch (byte >> 3 & 3) {
      case 0:
        output = [];
        input.map.set(input.offset, output);
        input.cursor += m+1;
        input.offset += m+1;
        for (let i = 0; i < n; i+=1) {
          if (isHoleByte(input)) throw errors.malformed;
          output.push(decodeData(input));
        }
        return output;
      case 1:
        output = {};
        input.map.set(input.offset, output);
        input.cursor += m+1;
        input.offset += m+1;
        for (let i = 0; i < n; i+=1) {
          if (isStringByte(input) === false) throw errors.malformed;
          const key = decodeData(input);
          if (output.hasOwnProperty(key)) throw errors.malformed;
          if (isHoleByte(input)) throw errors.malformed;
          output[key] = decodeData(input);
        }
        return output;
      case 2:
        output = new Map();
        input.map.set(input.offset, output);
        input.cursor += m+1;
        input.offset += m+1;
        for (let i = 0; i < n; i+=1) {
          const key = decodeData(input);
          if (output.has(key)) throw errors.malformed;
          if (isHoleByte(input)) throw errors.malformed;
          output.set(key, decodeData(input));
        }
        return output;
      case 3:
        output = new Set();
        input.map.set(input.offset, output);
        input.cursor += m+1;
        input.offset += m+1;
        for (let i = 0; i < n; i+=1) {
          if (isHoleByte(input)) throw errors.malformed;
          const key = decodeData(input);
          if (output.has(key)) throw errors.malformed;
          output.add(key);
        }
        return output;
    }
  }
  function decodeSparseArray(input) {
    if (input.method === "stream") throw errors.collection;
    let i = input.cursor;
    const byte = input.bytes[i++];
    const l = input.bytes.length;
    const m1 = (byte >> 2 & 3) + 1;
    if (i+m1 > l) throw errors.ended;
    const n1 = decodeUInt(input.bytes.subarray(i, i+=m1));
    const output = new Array(n1);
    const m2 = (byte & 3) + 1;
    if (i+m2 > l) throw errors.ended;
    const n2 = decodeUInt(input.bytes.subarray(i, i+=m2));
    input.map.set(input.offset, output);
    input.cursor += m1+m2+1;
    input.offset += m1+m2+1;
    if ((byte >> 4 & 1) === 0) {
      for (let i = 0; i < n2; i+=1) {
        const element = decodeData(input);
        if (element !== errors.hole) output[i] = element;
      }
      return output;
    } else {
      for (let i = 0; i < n2; i+=1) {
        if (isNaturalByte(input) === false) throw errors.malformed;
        const index = decodeData(input);
        if (index >= n1) throw errors.malformed;
        if (output.hasOwnProperty(index)) throw errors.malformed;
        if (isHoleByte(input)) throw errors.malformed;
        output[index] = decodeData(input);
      }
      return output;
    }
  }
  function decodeTypedArray(input) {
    const offset = input.offset;
    const byte = input.bytes[input.cursor];
    const swap = endian !== ((byte >> 4 & 1) ? "BE" : "LE");
    const type = byte & 15;
    input.cursor++;
    input.offset++;
    try {
      let output;
      if (isBufferByte(input) === false) throw errors.malformed;
      const buffer = decodeData(input);
      switch (type) {
        case 0:  output = new DataView(buffer); break;
        case 1:  output = new Int8Array(buffer); break;
        case 2:  output = new Uint8Array(buffer); break;
        case 3:  output = new Uint8ClampedArray(buffer); break;
        case 4:  output = swap ? new Int16Array(swap16(buffer.slice())) : new Int16Array(buffer); break;
        case 5:  output = swap ? new Uint16Array(swap16(buffer.slice())) : new Uint16Array(buffer); break;
        case 6:  output = swap ? new Int32Array(swap32(buffer.slice())) : new Int32Array(buffer); break;
        case 7:  output = swap ? new Uint32Array(swap32(buffer.slice())) : new Uint32Array(buffer); break;
        case 8:  output = swap ? new Float32Array(swap32(buffer.slice())) : new Float32Array(buffer); break;
        case 9:  output = swap ? new Float64Array(swap64(buffer.slice())) : new Float64Array(buffer); break;
        case 10: output = swap ? new BigInt64Array(swap64(buffer.slice())) : new BigInt64Array(buffer); break;
        case 11: output = swap ? new BigUint64Array(swap64(buffer.slice())) : new BigUint64Array(buffer); break;
        default: throw errors.malformed;
      }
      input.map.set(offset, output);
      return output;
    } catch(error) {
      if (error === errors.ended) {
        input.cursor--;
        input.offset--;
        throw error;
      } else {
        throw error;
      }
    }
  }
  function decodeDate(input) {
    const offset = input.offset;
    input.cursor++;
    input.offset++;
    try {
      if (isDateByte(input) === false) throw errors.malformed;
      const output = new Date(decodeData(input));
      input.map.set(offset, output);
      return output;
    } catch(error) {
      if (error === errors.ended) {
        input.cursor--;
        input.offset--;
        throw error;
      } else {
        throw error;
      }
    }
  }
  function decodeRegExp(input) {
    const offset = input.offset;
    input.cursor++;
    input.offset++;
    try {
      if (isStringByte(input) === false) throw errors.malformed;
      const string = decodeData(input);
      const index = string.lastIndexOf("/");
      if (string[0] !== "/" || index <= 0) throw errors.malformed;
      const output = new RegExp(string.slice(1, index), string.slice(index+1));
      input.map.set(offset, output);
      return output;
    } catch(error) {
      if (error === errors.ended) {
        input.cursor--;
        input.offset--;
        throw error;
      } else {
        throw error;
      }
    }
  }
  function decodeReference(input) {
    input.cursor++;
    input.offset++;
    try {
      if (isNaturalByte(input) === false) throw errors.malformed;
      const offset = decodeData(input);
      if (input.map.has(offset) === false) throw errors.malformed;
      return input.map.get(offset);
    } catch(error) {
      if (error === errors.ended) {
        input.cursor--;
        input.offset--;
        throw error;
      } else {
        throw error;
      }
    }
  }
  function decodeUInt(bytes) {
    let value = 0;
    let bits = 0;
    bytes.forEach(function(byte) {
      value += byte * Math.pow(2, bits);
      bits += 8;
    });
    return value;
  }
  function decodeBigUInt(bytes) {
    const big0 = BigInt(0);
    const big8 = BigInt(8);
    let value = big0;
    let bits = big0;
    bytes.forEach(function(byte) {
      value += BigInt(byte) << bits;
      bits += big8;
    });
    return value;
  }
  function decodeUTF8(bytes, m, n) {
    try {
      return new TextDecoder("utf-8").decode(bytes.subarray(m, n));
    } catch(error) {
      let i = m;
      let string = "";
      while (i < n) {
        let code;
        if (bytes[i] === 0) {
          break;
        } else if ((bytes[i] & 0x80) === 0) {
          string += String.fromCharCode(bytes[i++]);
        } else if ((bytes[i] & 0xE0) === 0xC0 && i+1 < n) {
          code = (bytes[i++] & 0x1F) << 6
               | (bytes[i++] & 0x3F);
          string += String.fromCharCode(code);
        } else if ((bytes[i] & 0xF0) === 0xE0 && i+2 < n) {
          code = (bytes[i++] & 0x0F) << 12
               | (bytes[i++] & 0x3F) << 6
               | (bytes[i++] & 0x3F);
          string += String.fromCharCode(code);
        } else if ((bytes[i] & 0xF8) === 0xF0 && i+3 < n) {
          code = (bytes[i++] & 0x07) << 18
               | (bytes[i++] & 0x3F) << 12
               | (bytes[i++] & 0x3F) << 6
               | (bytes[i++] & 0x3F);
          if (code > 0xFFFF) {
            code -= 0x10000;
            const upper = (code>>>10) & 0x3FF | 0xD800;
            const lower = (code & 0x3FF) | 0xDC00;
            string += String.fromCharCode(upper, lower);
          } else {
            string += String.fromCharCode(code);
          }
        } else {
          break;
        }
      }
      return string;
    }
  }
  function decodeStream(options) {
    let maxlength;
    if (options === undefined) {
      options = {};
    } else if (typeof options !== "object") {
      throw new TypeError("The options parameter must be an object.");
    }
    if (options.hasOwnProperty("maxlength") === false) {
      maxlength = 1073741824;
    } else if (typeof options.maxlength === "number" && options.maxlength > 0) {
      maxlength = options.maxlength;
    } else {
      throw new RangeError("The maxlength option must be a positive integer.");
    }
    const writer = decoder(maxlength);
    const writable = new WritableStream(writer);
    writer.stream = writable;
    return writable;
  }
  function decodeAsync(readable, options) {
    let maxlength;
    if (options === undefined) {
      options = {};
    } else if (typeof options !== "object") {
      throw new TypeError("The options parameter must be an object.");
    }
    if (options.hasOwnProperty("maxlength") === false) {
      maxlength = 1073741824;
    } else if (typeof options.maxlength === "number" && options.maxlength > 0) {
      maxlength = options.maxlength;
    } else {
      throw new RangeError("The maxlength option must be a positive integer.");
    }
    if (typeof readable === "object") {
      if (readable[Symbol.asyncIterator] !== undefined) {
        const iterator = readable[Symbol.asyncIterator]();
        const writer = decoder(maxlength);
        writer.start();
        return new Promise(function(resolve, reject) {
          iterator.next().then(callWriter).catch(reject);
          function callWriter(result) {
            if (result.done === false) {
              writer.write(result.value);
              iterator.next().then(callWriter).catch(reject);
            } else {
              resolve(writer.close());
            }
          }
        });
      } else if (readable.constructor.name === "ReadableStream") {
        const reader = readable.getReader();
        const writer = decoder(maxlength);
        writer.start();
        return new Promise(function(resolve, reject) {
          reader.read().then(callWriter).catch(reject);
          function callWriter(result) {
            if (result.done === false) {
              writer.write(result.value);
              reader.read().then(callWriter).catch(reject);
            } else {
              resolve(writer.close());
            }
          }
        });
      } else {
        throw new TypeError("The readable parameter must be a readable stream or async iterable.");
      }
    } else {
      throw new TypeError("The readable parameter must be a readable stream or async iterable.");
    }
  }
  function decoder(maxlength) {
    const input = {};
    const parents = [{}];
    const $i = Symbol();
    const $n = Symbol();
    const $key = Symbol();
    const $sparse = Symbol();
    const $keymap = Symbol();
    const $keyset = Symbol();
    return {
      start: startDecoder,
      close: closeDecoder,
      write: decodeChunk
    };
    function startDecoder(controller) {
      input.map = new Map();
      input.bytes = new Uint8Array(0);
      input.cursor = 0;
      input.offset = 0;
      input.length = 0;
      input.method = "stream";
      Object.defineProperty(parents[0], $n, { configurable: true, value: 1 });
      Object.defineProperty(parents[0], $i, { configurable: true, writable: true, value: 0 });
      Object.defineProperty(parents[0], $key, { configurable: true, writable: true, value: "root" });
    }
    function closeDecoder(controller) {
      if (input.bytes.length > 0) {
        if (controller !== undefined) {
          controller.error(errors.unused);
        } else {
          throw errors.unused;
        }
      } else {
        const result = parents[0].root;
        delete parents[0].root;
        if (this.stream !== undefined) {
          this.stream.result = result;
          delete this.stream;
        } else {
          return result;
        }
      }
    }
    function decodeChunk(chunk, controller) {
      let error;
      if ((input.length += chunk.length) <= maxlength) {
        input.bytes = concatBytes([input.bytes, chunk]);
        const l = input.bytes.length;
        let n = parents.length-1;
        while (n >= 0) {
          const parent = parents[n];
          const child = getValue(parent);
          if (child === errors.property) {
            try {
              if (input.cursor+1 > l) break;
              let output = decodeData(input);
              if (output !== errors.hole) {
                setValue(parent, output);
                if (n === 0) break;
                parents.pop();
                if (parents[n-1][$key] === $keymap) {
                  if (parents[n-1].has(child)) throw errors.malformed;
                  parents[n-1][$key] = output;
                }
              } else if (parent[$sparse] === "A") {
                parent[$i]++;
                parents.pop();
              } else {
                throw errors.malformed;
              }
            } catch(e) {
              if (e === errors.collection) {
                let i = input.cursor;
                const byte = input.bytes[i++];
                if ((byte >> 5) === 4) {
                  let output;
                  const m = (byte & 7) + 1;
                  if (i+m > l) break;
                  const nitem = decodeUInt(input.bytes.subarray(i, i+=m));
                  switch (byte >> 3 & 3) {
                    case 0: output = []; break;
                    case 1: output = {}; break;
                    case 2: output = new Map(); break;
                    case 3: output = new Set(); break;
                  }
                  Object.defineProperty(output, $n, { configurable: true, value: nitem });
                  Object.defineProperty(output, $i, { configurable: true, writable: true, value: 0 });
                  Object.defineProperty(output, $key, { configurable: true, writable: true, value: undefined });
                  setValue(parent, output);
                  input.map.set(input.offset, output);
                  input.cursor += m+1;
                  input.offset += m+1;
                } else if ((byte >> 5) === 5) {
                  const m1 = (byte >> 2 & 3) + 1;
                  if (i+m1 > l) break;
                  const n1 = decodeUInt(input.bytes.subarray(i, i+=m1));
                  const output = new Array(n1);
                  const m2 = (byte & 3) + 1;
                  if (i+m2 > l) break;
                  const n2 = decodeUInt(input.bytes.subarray(i, i+=m2));
                  Object.defineProperty(output, $n, { configurable: true, value: n2 });
                  Object.defineProperty(output, $i, { configurable: true, writable: true, value: 0 });
                  Object.defineProperty(output, $key, { configurable: true, writable: true, value: undefined });
                  Object.defineProperty(output, $sparse, { configurable: true, value: ((byte >> 4 & 1) === 0 ? "A" : "B") });
                  setValue(parent, output);
                  input.map.set(input.offset, output);
                  input.cursor += m1+m2+1;
                  input.offset += m1+m2+1;
                }
              } else {
                if (e !== errors.ended) error = e;
                break;
              }
            }
          } else if (child[$i] < child[$n]) {
            const name = child.constructor.name;
            if (name === "Array") {
              if (child[$sparse] !== "B") {
                child[$key] = child[$i];
                parents.push(child);
              } else {
                try {
                  if (isNaturalByte(input) === false) throw errors.malformed;
                  const index = decodeData(input);
                  if (index >= child.length) throw errors.malformed;
                  if (child.hasOwnProperty(index)) throw errors.malformed;
                  child[$key] = index;
                  parents.push(child);
                } catch(e) {
                  if (e !== errors.ended) error = e;
                  break;
                }
              }
            } else if (name === "Object") {
              try {
                if (isStringByte(input) === false) throw errors.malformed;
                const key = decodeData(input);
                if (child.hasOwnProperty(key)) throw errors.malformed;
                child[$key] = key;
                parents.push(child);
              } catch(e) {
                if (e !== errors.ended) error = e;
                break;
              }
            } else if (name === "Map") {
              child[$key] = $keymap;
              parents.push(child);
              const object = {};
              Object.defineProperty(object, $n, { configurable: true, value: 1 });
              Object.defineProperty(object, $i, { configurable: true, writable: true, value: 0 });
              Object.defineProperty(object, $key, { configurable: true, writable: false, value: "root" });
              parents.push(object);
            } else if (name === "Set") {
              child[$key] = $keyset;
              parents.push(child);
            }
          } else {
            delete child[$sparse];
            delete child[$key];
            delete child[$i];
            delete child[$n];
            if (n === 0) break;
            parents.pop();
            if (parents[n-1][$key] === $keymap) {
              if (parents[n-1].has(child)) throw errors.malformed;
              parents[n-1][$key] = child;
            }
          }
          n = parents.length-1;
        }
        if (error === undefined) {
          input.bytes = input.bytes.slice(input.cursor);
          input.cursor = 0;
        }
      } else {
        error = errors.exceeded;
      }
      if (error !== undefined) {
        if (controller !== undefined) {
          controller.error(error);
        } else {
          throw error;
        }
      }
    }
    function setValue(parent, value) {
      const name = parent.constructor.name;
      if (name === "Array") {
        if (parent.hasOwnProperty($sparse)) {
          parent[parent[$key]] = value;
          parent[$i]++;
        } else {
          parent.push(value);
          parent[$i]++;
        }
      } else if (name === "Object") {
        parent[parent[$key]] = value;
        parent[$i]++;
      } else if (name === "Map") {
        parent.set(parent[$key], value);
        parent[$i]++;
      } else if (name === "Set") {
        if (parent.has(value)) throw errors.malformed;
        parent.add(value);
        parent[$key] = value;
        parent[$i]++;
      }
    }
    function getValue(parent) {
      const key = parent[$key];
      const name = parent.constructor.name;
      if (name === "Array" || name === "Object") {
        return parent.hasOwnProperty(key) ? parent[key] : errors.property;
      } else if (name === "Map") {
        return parent.has(key) ? parent.get(key) : errors.property;
      } else if (name === "Set") {
        return parent.has(key) ? key : errors.property;
      }
    }
  }
  function getEndianness() {
    const b = new ArrayBuffer(2);
    const u = new Uint16Array(b); u[0] = 0xFEFF;
    const v = new Uint8Array(b); return (v[0] === 0xFE) ? "BE" : "LE";
  }
  function appendBytes(output, bytes) {
    output.bytes.push(bytes);
    output.length += bytes.length;
  }
  function concatBytes(array, n) {
    let length = 0;
    let offset = 0;
    if (n === undefined) {
      array.forEach(function(element) {
        length += element.length;
      });
    } else {
      length = n;
    }
    const bytes = new Uint8Array(length);
    array.forEach(function(element) {
      bytes.set(element, offset);
      offset += element.length;
    });
    return bytes;
  }
  function analyzeArray(array) {
    let n1 = 0;
    let n2 = 0;
    let n3 = 0;
    let n4 = 0;
    let nslot = -1;
    array.forEach(function(element, index) {
      nslot = index;
      if (index <= 65535) {
        if (index <= 255) {
          n1++;
        } else {
          n2++;
        }
      } else {
        if (index <= 1677215) {
          n3++;
        } else {
          n4++;
        }
      }
    });
    nslot += 1;
    const nelement = n1+n2+n3+n4;
    if (nelement === array.length) {
      return {};
    } else {
      const nempty = nslot - nelement;
      const nindex = 2*n1+3*n2+4*n3+5*n4;
      if (nempty <= nindex) {
        return { nslot: nslot };
      } else {
        return { nelement: nelement };
      }
    }
  }
  function swap16(buffer) {
    const u = new Uint8Array(buffer);
    for (let i = 0, n = u.length; i < n; i += 2) {
      const v = u[i];
      u[i] = u[i+1];
      u[i+1] = v;
    }
    return buffer;
  }
  function swap32(buffer) {
    const u = new Uint8Array(buffer);
    for (let i = 0, n = u.length; i < n; i += 4) {
      for (let j = 0; j < 2; j += 1) {
        const v = u[i+j];
        u[i+j] = u[i+3-j];
        u[i+3-j] = v;
      }
    }
    return buffer;
  }
  function swap64(buffer) {
    const u = new Uint8Array(buffer);
    for (let i = 0, n = u.length; i < n; i += 8) {
      for (let j = 0; j < 4; j += 1) {
        const v = u[i+j];
        u[i+j] = u[i+7-j];
        u[i+7-j] = v;
      }
    }
    return buffer;
  }
  function isNaturalByte(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) throw errors.ended;
    return byte >> 5 === 1 && (byte >> 4 & 1) === 0 && (byte >> 3 & 1) === 0;
  }
  function isHoleByte(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) throw errors.ended;
    return byte === 12;
  }
  function isStringByte(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) throw errors.ended;
    return byte >> 5 === 3 && (byte >> 3 & 3) === 0;
  }
  function isBufferByte(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) throw errors.ended;
    return byte >> 5 === 3 && (byte >> 3 & 3) >= 2;
  }
  function isDateByte(input) {
    const byte = input.bytes[input.cursor];
    if (byte === undefined) throw errors.ended;
    return (byte >> 5 === 1 && (byte >> 4 & 1) === 0) || byte === 10;
  }
