

# jsxk (JSX Kit)

> Provides a two-way communication interface between NodeJS and Adobe ExtendScript (JSX) files.

This library is built for command-line NodeJS scripts interfacing with Adobe Photoshop or Illustrator.

### How it works

1.  NodeJS makes a temporary duplicate of a standalone JSX, overwrites the values of supplied variables and executes it
2. The temporary JSX script runs, optionally calling `jsxOnComplete` after completion with any returned data
3. This data is appended to the temporary script file itself, that is picked up by Node
4. Node deletes the temporary JSX script and returns the data via promise or callback

### Advantages

- Injecting variables into an existing JSX script allows the JSX to be executed by itself without relying on NodeJS. This makes authoring and testing the JSX script much more convenient.
- Executing a local JSX script file utilises the native ExtendScript environment on the host system so doesn't rely on complicated dependencies such as AppleScript to perform the script.
- File based callback system ensures the JSX script has completed before moving on.

### Installation

```
npm install jsxk --save
```

### Basic usage

```
// NodeJS script

const jsxk = require('jsxk');

jsxk.exec('alert.jsx', {MESSAGE:'Hola'}).then(console.log,console.error);

```

``` 
// alert.jsx

#target photoshop

app.bringToFront();

var MESSAGE = 'Default'; 

alert(MESSAGE);

```

The example JSX script will be executed with the `MESSAGE` variable overridden with the supplied value `Hola`. The result is returned to Node as a promise.

### Returning data from JSX

```
// NodeJS script

const jsxk = require('jsxk');

jsxk.exec('example.jsx').then(function(data){
  console.log(data.msg)
}).catch(console.error);
```

``` 
// receive-message.jsx

#target photoshop

app.bringToFront();

jsxOnComplete({msg:'Hi from JSX'});

function jsxOnComplete(data){
// Will be overridden
}

```

Calling `jsxOnComplete(data)` from the JSX script will flag the script has finished and optionally return a data object. In the above example `Hi from JSX` will be returned to Node and written to the console.

### Using a callback function instead of a promise

```
jsxk.exec('example.jsx', {foo:'bar'}, function(err, data){
  
  if (err){
    throw err;
  }
  
  console.log(data);
  
});
```

### Targeting a process

The [open](https://www.npmjs.com/package/open) library is used to execute the JSX script. It will use the default program associated with JSX files on the host machine, usually Illustrator or Photoshop.

To target a specific process set the `targetProcess` option before running the script.

```
jsx.options.targetProcess = 'Adobe Photoshop 2020';
jsxk.exec(...);
```

### Release History ###

[CHANGELOG.md](CHANGELOG.md)
