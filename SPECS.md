<header>
  <h1>JS Open Serialization Scheme</h1>
</header>

<section>
  <h2>Table of Contents</h2>
  <ul>
    <li><a href="#section-introduction">1. Introduction</a></li>
    <li><a href="#section-serialization">2. Serialization</a>
      <ul>
        <li><a href="#section-serialization-standalone">2.1. Standalone</a></li>
        <li><a href="#section-serialization-number">2.2. Numbers</a></li>
        <li><a href="#section-serialization-bigint">2.3. Big Integers</a></li>
        <li><a href="#section-serialization-string">2.4. Character and Binary Strings</a></li>
        <li><a href="#section-serialization-dense">2.5. Dense Arrays and Collections</a></li>
        <li><a href="#section-serialization-sparse">2.6. Sparse Arrays</a></li>
        <li><a href="#section-serialization-typed">2.7. Typed Arrays</a></li>
        <li><a href="#section-serialization-date">2.8. Dates</a></li>
        <li><a href="#section-serialization-regexp">2.9. Regular Expressions</a></li>
        <li><a href="#section-serialization-reference">2.10. Object References</a></li>
        <li><a href="#section-serialization-custom">2.11. Custom Objects</a></li>
        <li><a href="#section-serialization-unsupported">2.12. Unsupported Data</a></li>
      </ul>
    </li>
    <li><a href="#section-deserialization">3. Deserialization</a></li>
    <li><a href="#section-limitations">4. Limitations</a></li>
    <li><a href="#section-extensions">5. Extensions</a></li>
    <li><a href="#section-copyright">6. Copyright</a></li>
  </ul>
</section>

<section id="section-introduction">
  <h2>1. Introduction</h2>
  <p>JavaScript can be run not only in browsers, but also on servers through the use of JavaScript runtime environments, such as <a href="https://deno.land">Deno</a> and <a href="https://nodejs.org">Node.js</a>.</p>
  <p>The de facto serialization format for exchanging data between browsers and servers is JavaScript Object Notation (JSON). However, browsers and servers that exchange data in JSON format are limited to the few data structures native to JSON, even when they can both run JavaScript.</p>
  <p>This page documents the specification for a serialization format called the JS Open Serialization Scheme (JOSS). The format supports almost all data types and data structures intrinsic to JavaScript. The format also supports some often overlooked features of JavaScript, such as primitive wrapper objects, circular references, sparse arrays, and negative zeros.</p>
</section>

<section id="section-serialization">
  <h2>2. Serialization</h2>
  <p>The serialization of a JavaScript data item begins with a single byte, called a marker byte. In some cases, the marker byte is standalone. In general, it is concatenated with a sequence of bytes to complete the serialization.</p>
</section>

<section id="section-serialization-standalone">
  <h3>2.1. Standalone</h3>
  <p>The marker bytes with values 0&ndash;31 are listed in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-standalone">
    <caption>Table 1. Standalone marker bytes and others.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>0</td>
        <td>Multipurpose</td>
      </tr>
      <tr>
        <td rowspan="20">3–7</td>
        <td>0</td>
        <td><code>null</code></td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>undefined</code></td>
      </tr>
      <tr>
        <td>2</td>
        <td><code>true</code> as a <code>Boolean</code> value</td>
      </tr>
      <tr>
        <td>3</td>
        <td><code>true</code> as a <code>Boolean</code> object</td>
      </tr>
      <tr>
        <td>4</td>
        <td><code>false</code> as a <code>Boolean</code> value</td>
      </tr>
      <tr>
        <td>5</td>
        <td><code>false</code> as a <code>Boolean</code> object</td>
      </tr>
      <tr>
        <td>6</td>
        <td><code>Infinity</code> as a <code>Number</code> value</td>
      </tr>
      <tr>
        <td>7</td>
        <td><code>Infinity</code> as a <code>Number</code> object</td>
      </tr>
      <tr>
        <td>8</td>
        <td><code>-Infinity</code> as a <code>Number</code> value</td>
      </tr>
      <tr>
        <td>9</td>
        <td><code>-Infinity</code> as a <code>Number</code> object</td>
      </tr>
      <tr>
        <td>10</td>
        <td><code>NaN</code> as a <code>Number</code> value</td>
      </tr>
      <tr>
        <td>11</td>
        <td><code>NaN</code> as a <code>Number</code> object</td>
      </tr>
      <tr>
        <td>12</td>
        <td id="marker-hole">Hole in an <code>Array</code></td>
      </tr>
      <tr>
        <td>13</td>
        <td id="marker-unsupported">Unsupported data</td>
      </tr>
      <tr>
        <td>14</td>
        <td id="marker-date">Marker byte for <code>Date</code></td>
      </tr>
      <tr>
        <td>15</td>
        <td id="marker-regexp">Marker byte for <code>RegExp</code></td>
      </tr>
      <tr>
        <td>16–28</td>
        <td>Reserved for future extensions</td>
      </tr>
      <tr>
        <td>29</td>
        <td id="marker-reference">Marker byte for object reference</td>
      </tr>
      <tr>
        <td>30</td>
        <td id="marker-custom">Marker byte for custom object</td>
      </tr>
      <tr>
        <td>31</td>
        <td>Reserved for future extensions</td>
      </tr>
    </tbody>
  </table>
  <p>The values 0&ndash;13 are for standalone marker bytes. The other values are either for marker bytes acting as semantic tags or reserved for future extensions.</p>
</section>

<section id="section-serialization-number">
  <h3>2.2. Numbers</h3>
  <p>The <code>Number</code> type is used to represent numbers stored in double-precision format. It is serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-number">
    <caption>Table 2. Marker byte for numbers.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>1</td>
        <td><code>Number</code></td>
      </tr>
      <tr>
        <td rowspan="2">3</td>
        <td>0</td>
        <td><code>Number</code> value</td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>Number</code> object</td>
      </tr>
      <tr>
        <td rowspan="3">4</td>
        <td colspan="2">If integer:</td>
      </tr>
      <tr>
        <td>0</td>
        <td>Integer is not negative-valued</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Integer is negative-valued</td>
      </tr>
      <tr>
        <td rowspan="8">5–7</td>
        <td>0</td>
        <td>Payload is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Payload is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Payload is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Payload is 4 bytes long</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Payload is 5 bytes long</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Payload is 6 bytes long</td>
      </tr>
      <tr>
        <td>6</td>
        <td>Payload is 7 bytes long</td>
      </tr>
      <tr>
        <td>7</td>
        <td>Payload is 8 bytes long</td>
      </tr>
    </tbody>
  </table>
  <p>If the represented number is not an integer, the payload is the value of the number encoded in double-precision format and little-endian byte ordering. The payload is exactly 64 bits or 8 bytes long in this case.</p>
  <p>If the represented number is an integer, the payload is the absolute value of the integer encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering. The payload is at most 53 bits or 7 bytes long in this case.</p>
  <p><code>Infinity</code>, <code>-Infinity</code>, and <code>NaN</code> are special cases of the <code>Number</code> type serialized using <a href="#marker-standalone">standalone marker bytes</a>.</p>
</section>

<section id="section-serialization-bigint">
  <h3>2.3. Big Integers</h3>
  <p>The <code>BigInt</code> type is used to represent arbitrarily big integers. It is serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The payload size.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-bigint">
    <caption>Table 3. Marker byte for big integers.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>2</td>
        <td><code>BigInt</code></td>
      </tr>
      <tr>
        <td rowspan="2">3</td>
        <td>0</td>
        <td><code>BigInt</code> value</td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>BigInt</code> object</td>
      </tr>
      <tr>
        <td rowspan="2">4</td>
        <td>0</td>
        <td>Integer is not negative-valued</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Integer is negative-valued</td>
      </tr>
      <tr>
        <td rowspan="8">5–7</td>
        <td>0</td>
        <td>Payload size is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Payload size is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Payload size is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Payload size is 4 bytes long</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Payload size is 5 bytes long</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Payload size is 6 bytes long</td>
      </tr>
      <tr>
        <td>6</td>
        <td>Payload size is 7 bytes long</td>
      </tr>
      <tr>
        <td>7</td>
        <td>Payload size is 8 bytes long</td>
      </tr>
    </tbody>
  </table>
  <p>The payload is the absolute value of the represented integer encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering.</p>
  <p>The payload size is the byte length of the payload encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering.</p>
</section>

<section id="section-serialization-string">
  <h3>2.4. Character and Binary Strings</h3>
  <p>The <code>String</code> type and <code>ArrayBuffer</code> object are used to represent character strings and binary strings respectively. They are serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The payload size.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-string">
    <caption>Table 4. Marker byte for character and binary strings.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>3</td>
        <td><code>String</code>, <code>ArrayBuffer</code>, <code>SharedArrayBuffer</code></td>
      </tr>
      <tr>
        <td rowspan="4">3–4</td>
        <td>0</td>
        <td><code>String</code> value</td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>String</code> object</td>
      </tr>
      <tr>
        <td>2</td>
        <td><code>ArrayBuffer</code></td>
      </tr>
      <tr>
        <td>3</td>
        <td><code>SharedArrayBuffer</code></td>
      </tr>
      <tr>
        <td rowspan="8">5–7</td>
        <td>0</td>
        <td>Payload size is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Payload size is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Payload size is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Payload size is 4 bytes long</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Payload size is 5 bytes long</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Payload size is 6 bytes long</td>
      </tr>
      <tr>
        <td>6</td>
        <td>Payload size is 7 bytes long</td>
      </tr>
      <tr>
        <td>7</td>
        <td>Payload size is 8 bytes long</td>
      </tr>
    </tbody>
  </table>
  <p>The payload is the represented character string encoded in UTF-8 code units or the represented binary string, whichever is applicable.</p>
  <p>The payload size is the byte length of the payload encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering.</p>
</section>

<section id="section-serialization-dense">
  <h3>2.5. Dense Arrays and Collections</h3>
  <p>The <code>Array</code>, <code>Object</code>, <code>Map</code>, and <code>Set</code> objects are used to represent indexed and keyed collections of data. They are serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The payload size.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-dense">
    <caption>Table 5. Marker byte for dense arrays and collections.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>4</td>
        <td>Dense <code>Array</code>, plain <code>Object</code>, <code>Map</code>, <code>Set</code></td>
      </tr>
      <tr>
        <td rowspan="4">3–4</td>
        <td>0</td>
        <td>Dense <code>Array</code></td>
      </tr>
      <tr>
        <td>1</td>
        <td>Plain <code>Object</code></td>
      </tr>
      <tr>
        <td>2</td>
        <td><code>Map</code></td>
      </tr>
      <tr>
        <td>3</td>
        <td><code>Set</code></td>
      </tr>
      <tr>
        <td rowspan="8">5–7</td>
        <td>0</td>
        <td>Payload size is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Payload size is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Payload size is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Payload size is 4 bytes long</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Payload size is 5 bytes long</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Payload size is 6 bytes long</td>
      </tr>
      <tr>
        <td>6</td>
        <td>Payload size is 7 bytes long</td>
      </tr>
      <tr>
        <td>7</td>
        <td>Payload size is 8 bytes long</td>
      </tr>
    </tbody>
  </table>
  <p>The payload is the serialization of</p>
  <ul>
    <li><code>Array</code>: The elements in ascending order of index.</li>
    <li><code>Object</code>: The key-value pairs of own enumerable properties keyed by strings, optionally in the order returned by the <code>[[OwnPropertyKeys]]</code> method.</li>
    <li><code>Map</code>: The key-value pairs in order of insertion.</li>
    <li><code>Set</code>: The values in order of insertion.</li>
  </ul>
  <p>The payload size is the number of items in the payload encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering. Each key-value pair is considered one item.</p>
  <p>The aforementioned serialization is not applicable to <code>Array</code> objects with holes. The serialization of such objects is described in the next subsection.</p>
</section>

<section id="section-serialization-sparse">
  <h3>2.6. Sparse Arrays</h3>
  <p>The previous subsection is not applicable to <code>Array</code> objects with holes. Such objects are serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The array size.</li>
    <li>The payload size.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-sparse">
    <caption>Table 6. Marker byte for sparse arrays.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>5</td>
        <td>Sparse <code>Array</code></td>
      </tr>
      <tr>
        <td rowspan="2">3</td>
        <td>0</td>
        <td>Holes are serialized explicitly</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Indices are serialized explicitly</td>
      </tr>
      <tr>
        <td rowspan="4">4–5</td>
        <td>0</td>
        <td>Array size is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Array size is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Array size is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Array size is 4 bytes long</td>
      </tr>
      <tr>
        <td rowspan="4">6–7</td>
        <td>0</td>
        <td>Payload size is 1 byte long</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Payload size is 2 bytes long</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Payload size is 3 bytes long</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Payload size is 4 bytes long</td>
      </tr>
    </tbody>
  </table>
  <p>The payload is the serialization of</p>
  <ul>
    <li id="section-method-A">Method A: The holes and elements in ascending order of index, up to and including the last element. Holes after the last element are omitted.</li>
    <li id="section-method-B">Method B: The index-element pairs in ascending order of index.</li>
  </ul>
  <p>The payload under method A is analogous to the payload of a dense <code>Array</code> in that holes are treated like elements. Holes are serialized explicitly using a <a href="#marker-hole">standalone marker byte</a>.</p>
  <p>The payload under method B is analogous to the payload of an <code>Object</code> in that indices are treated like property keys.</p>
  <p>The payload size is the number of items in the payload encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering. Each index-element pair is considered one item.</p>
  <p>The array size is the value of the <code>length</code> property encoded as an unsigned integer in the fewest bytes possible and little-endian byte ordering.</p>
</section>

<section id="section-serialization-typed">
  <h3>2.7. Typed Arrays</h3>
  <p>The <code>DataView</code> and <code>TypedArray</code> objects are used to access <code>ArrayBuffer</code> objects. They are serialized by concatenating</p>
  <ol>
    <li>The marker byte.</li>
    <li>The payload.</li>
  </ol>
  <p>The marker byte is defined in the following table. The most significant bit is assigned the bit number 0.</p>
  <table id="marker-typed">
    <caption>Table 7. Marker byte for typed arrays.</caption>
    <thead>
      <tr>
        <th>Bit</th>
        <th>Value</th>
        <th>Interpretation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0–2</td>
        <td>6</td>
        <td><code>DataView</code>, <code>TypedArray</code></td>
      </tr>
      <tr>
        <td rowspan="2">3</td>
        <td>0</td>
        <td>Elements are in little-endian byte ordering</td>
      </tr>
      <tr>
        <td>1</td>
        <td>Elements are in big-endian byte ordering</td>
      </tr>
      <tr>
        <td rowspan="13">4–7</td>
        <td>0</td>
        <td><code>DataView</code></td>
      </tr>
      <tr>
        <td>1</td>
        <td><code>Int8Array</code></td>
      </tr>
      <tr>
        <td>2</td>
        <td><code>Uint8Array</code></td>
      </tr>
      <tr>
        <td>3</td>
        <td><code>Uint8ClampedArray</code></td>
      </tr>
      <tr>
        <td>4</td>
        <td><code>Int16Array</code></td>
      </tr>
      <tr>
        <td>5</td>
        <td><code>Uint16Array</code></td>
      </tr>
      <tr>
        <td>6</td>
        <td><code>Int32Array</code></td>
      </tr>
      <tr>
        <td>7</td>
        <td><code>Uint32Array</code></td>
      </tr>
      <tr>
        <td>8</td>
        <td><code>Float32Array</code></td>
      </tr>
      <tr>
        <td>9</td>
        <td><code>Float64Array</code></td>
      </tr>
      <tr>
        <td>10</td>
        <td><code>BigInt64Array</code></td>
      </tr>
      <tr>
        <td>11</td>
        <td><code>BigUint64Array</code></td>
      </tr>
      <tr>
        <td>12–15</td>
        <td>Reserved for future extensions</td>
      </tr>
    </tbody>
  </table>
  <p>The payload is the serialization of the binary string returned by the <code>buffer</code> property and segmented by the <code>byteOffset</code> and <code>byteLength</code> properties.</p>
</section>

<section id="section-serialization-date">
  <h3>2.8. Dates</h3>
  <p>The <code>Date</code> object is used to represent dates and times. It is serialized by concatenating</p>
  <ol>
    <li>The <a href="#marker-date">marker byte</a> for <code>Date</code>.</li>
    <li>The serialization of the number returned by the <code>valueOf()</code> method.</li>
  </ol>
</section>

<section id="section-serialization-regexp">
  <h3>2.9. Regular Expressions</h3>
  <p>The <code>RegExp</code> object is used to represent regular expressions. It is serialized by concatenating</p>
  <ol>
    <li>The <a href="#marker-regexp">marker byte</a> for <code>RegExp</code>.</li>
    <li>The serialization of the string returned by the <code>toString()</code> method.</li>
  </ol>
</section>

<section id="section-serialization-reference">
  <h3>2.10. Object References</h3>
  <p>A reference to an object whose marker byte can be found in the serialized byte stream is serialized by concatenating</p>
  <ol>
    <li>The <a href="#marker-reference">marker byte</a> for object reference.</li>
    <li>The serialization of the position of the referenced object's marker byte in the serialized byte stream, where the first byte is at position zero.</li>
  </ol>
</section>

<section id="section-serialization-custom">
  <h3>2.11. Custom Objects</h3>
  <p>A custom object that can be serialized using an external serialization format is serialized by concatenating</p>
  <ol>
    <li>The <a href="#marker-custom">marker byte</a> for custom object.</li>
    <li>The serialization of the custom object in accordance with the external serialization format.</li>
  </ol>
</section>

<section id="section-serialization-unsupported">
  <h3>2.12. Unsupported Data</h3>
  <p>Any data type or data structure not covered by the preceding subsections is serialized using a <a href="#marker-unsupported">standalone marker byte</a>.</p>
</section>

<section id="section-deserialization">
  <h2>3. Deserialization</h2>
  <p>The deserialization of a JavaScript data item is accomplished by decoding a serialized byte stream with reference to the serialization format.</p>
  <p>The deserialization process should substitute an appropriate <code>Error</code> object in the following scenarios:</p>
  <ul>
    <li>The marker byte for unsupported data is encountered.</li>
    <li>The JavaScript engine cannot return the required data.</li>
  </ul>
  <p>The deserialization process should stop when the serialized byte stream is malformed as in, but not limited to, the following scenarios:</p>
  <ul>
    <li>A reserved marker byte is encountered.</li>
    <li>An invalid data type is encountered, such as
      <ul>
        <li>An <code>Object</code> key that is not a <code>String</code> value.</li>
        <li>An <code>Array</code> index that is not a <code>Number</code> value.</li>
      </ul>
    </li>
    <li>An invalid value is encountered, such as
      <ul>
        <li>An <code>Array</code> index that is out of bounds.</li>
        <li>A duplicate <code>Array</code> index, <code>Object</code> key, <code>Map</code> key, or <code>Set</code> value.</li>
      </ul>
    </li>
    <li>The standalone marker byte for a hole is encountered outside the context of a sparse <code>Array</code>.</li>
    <li>The payload of a <code>Number</code> type encodes an integer longer than 53 bits.</li>
    <li>The payload of an object reference does not point to a prior object.</li>
    <li>The serialized byte stream ends before the deserialization process.</li>
    <li>The deserialization process ends before the serialized byte stream.</li>
  </ul>
</section>

<section id="section-limitations">
  <h2>4. Limitations</h2>
  <p>The serialization format does not support certain data types and data structures intrinsic to JavaScript, such as <code>Error</code>, <code>Function</code>, <code>Symbol</code>, and objects that hold weak references like <code>WeakMap</code>, <code>WeakSet</code>, and <code>WeakRef</code>.</p>
  <p>The serialization format also does not preserve object properties that are non-enumerable, keyed by symbols, or inherited through the prototype chain, such as the <code>byteOffset</code> property of <code>TypedArray</code> objects and the <code>lastIndex</code> property of <code>RegExp</code> objects.</p>
</section>

<section id="section-extensions">
  <h2>5. Extensions</h2>
  <p>The serialization format reserves the marker byte values 224&ndash;255, as well as those labelled as reserved in <a href="#marker-standalone">Table 1</a> and <a href="#marker-typed">Table 7</a>, for future extensions.</p>
</section>

<section id="section-copyright">
  <h2>6. Copyright</h2>
  <p>Copyright &copy; 2021 Quantitative Risk Solutions PLT (201604001668). All rights reserved.</p>
</section>
