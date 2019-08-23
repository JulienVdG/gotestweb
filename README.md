# GoTestWeb

GoTestWeb is a web frontend application to render `go test` JSON output in a browser.

## Features

 - No pre-processing needed, it can render the output of `go test -json`.
 - Entries can be unfolded and folded to hide verbose output.
 - Successful tests are folded by default.
 - Integrates [asciinema player](https://github.com/asciinema/asciinema-player) to render console outputs.

## Usage

See `index.html` for basic usage.

The js app accepts parameters in two forms:
 1. `data-*` attributes on the `script` tag
 2. URL parameters (after `#`)

The URL parameter override the attributes parameters.

| Parameter   | Usage |
| ----------- | ----- |
| `file`      | `file` is the path to the line separated JSON file to render. |
| `asciicast` | `asciicast` is the directory path to find asciicast files. It default to the directory part of `file`. |
| `summary`   | `summary` display a package summary above all tests for the same package. |
| `live`      | live mode: in live mode `file` is ignored, `summary` default to on and the content is fetched from a websocket at `/live`. |

Typical URL parameter has the form `#path-to-file?param=value&param2=value`
Where `path-to-file` replace the value for the `file` parameter.

## Go integration

To run GoTestWeb locally or generates files for CI integration you should have a look at [JulienVdG/tastevin](https://github.com/JulienVdG/tastevin).

## Build

```
git clone https://github.com/JulienVdG/gotestweb.git

cd gotestweb

npm install

npm run build
```

The minified files will be present in the `dist` directory.

## Development

The following command allows for quick development by launching a webserver and rebuilding the code each time it is changed.

```
npm run dev
```


