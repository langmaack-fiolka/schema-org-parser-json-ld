This parser is used to get the json-ld from any website. The json-ld should have an schema.org annotation.

**Installation**
```
npm install schema-org-parser-json-ld
```

**Example**

```javascript
var parser = require('schema-org-parser-json-ld');
...

parser.getJsonLdOfUrl(url).then(function(result) {
  ...
}).catch(function(error) {
  ...
})
```
