# Generate SVG Component

Creates an SVG React component from an SVG file on the command line!

This command also:

- removes `id` and `data-name` attributes
- renames `xmlns` and `xlink` attributes
- `<g>` tags

There are still some things like component name that depend on file names that could be improved.

## Usage

Checkout this repo then run `npm install`.

Then:

```
ts-node index.ts ~/Downloads/*.svg
```

## Options

`--output`, `-o`: Output files to stdin (default)

`--create`, `--create=path`, `-c`, `-c=path`: Create the files (optionally specify path... default path is the same directory as the command is run from)
