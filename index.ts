import Debug from 'debug';
import { readFile, writeFile } from 'fs';
import minimist from 'minimist';
import mkdirp from 'mkdirp';
import { basename, join } from 'path';
import { promisify } from 'util';
import { Builder, parseString } from 'xml2js';

const readFilePromise = promisify(readFile);
const writeFilePromise = promisify(writeFile);
const parseStringPromise = promisify(parseString);

const d = Debug('generate-svg-component');

type FileData = {
    status: boolean;
    data: string;
    fileName: string;
}

function readSVGFile(fileName: string) {
    return readFilePromise(fileName, 'utf8')
        .then(data => ({ status: true, data, fileName }));
}

export async function generateComponent(fileData: FileData, createFile: boolean | string = false, output = true): Promise<string> {
    d('generateComponent', fileData);
    const xml = await parseStringPromise(fileData.data.trim());
    const builder = new Builder({ headless: true });
    const component: any = {};
    walkSVG(xml, component);
    const svg = builder.buildObject(component);
    const componentName = getComponentName(fileData);

    const data = `import React from 'react';\n\nexport function ${componentName}() {\n    return (${svg});\n}\n`;

    if (output) {
        console.log('\n\n============================================\n\n');
        console.log(data);
    }

    if (createFile) {
        const fileName = createFile === true ? join(__dirname, `${componentName}.tsx`) : join(createFile, `${componentName}.tsx`);
        try {
            await writeFilePromise(fileName, data, { encoding: 'utf8', flag: 'wx' });
            d('generateComponent: created file', fileName);
        }
        catch (err) {
            console.error('Error creating file', fileName, (err as any).code);
        }
    }
    return data;
}

function getComponentName(fileData: FileData) {
    const { fileName } = fileData;
    const nameOnly = basename(fileName).replace(/\.svg/i, '');
    return `${nameOnly.charAt(0).toUpperCase()}${nameOnly.slice(1)}`;
}

const ignoredElements = ['g', 'defs', 'style'];

declare global {
  interface ObjectConstructor {
    fromEntries(xs: [string|number|symbol, any][]): unknown
  }
}

function walkSVG(xml: any, component: any) {
    const entries = Object.entries(xml);
    const componentType = typeof component;
    if (componentType !== 'object') {
        return;
    }
    entries
        .forEach((entry) => {
            const [tag, child] = entry;
            const children = child as any;

            if (!ignoredElements.includes(tag)) {
                if (componentType === 'object' && !(tag in component)) {
                    component[tag] = {} as any;
                }
                else if (componentType === 'object' && tag in component && !Array.isArray(component[tag])) {
                    const currentValue = component[tag];
                    component[tag] = [currentValue];
                }

                const thisComponent = {} as any;
                if (typeof children === 'object' && '$' in children) {
                    thisComponent['$'] = renameAttributes(filterAttributes(children['$']));
                }

                if (Array.isArray(component[tag])) {
                    component[tag].push(thisComponent);
                }
                else {
                    component[tag] = thisComponent;
                }
            }

            const parent = tag in component ? component[tag] : component;

            Object.entries(children as any)
                .filter(([childTag, ]) => childTag !== '$')
                .forEach(([childTag, ]) => {
                    // d({ childTag, tag, child: children[childTag], comp: component[tag], parent });
                    if (Array.isArray(children[childTag])) {
                        children[childTag].forEach((thisChild: any) => {
                            walkSVG({ [childTag]: {...thisChild} }, parent);
                        });
                        return;
                    }
                    // d(children[childTag], component[tag]);
                    walkSVG(children[childTag], component[tag]);
                });
        });
}

function assureCreateFilesPath(path: string) {
    d('assureCreateFilesPath', path);
    mkdirp(path);
}

const ignoredAttributes = ['id', 'path-name', 'data-name', 'class'];

function filterAttributes(attributes: Attributes): Attributes {
    return Object.fromEntries(Object.entries(attributes)
        .filter(([name, value]) => !ignoredAttributes.includes(name))) as Attributes;
}

type AttributeNameMap = {
    [key: string]: string;
}
const attributeNameMap: AttributeNameMap = {
    'xmlns:link': 'xmlnsLink',
    'xmlns:xlink': 'xmlnsXlink',
    'xlink:href': 'xlinkHref',
};

type Attributes = {
    [key: string]: string | string[];
}

export function renameAttributes(attributes: Attributes): Attributes {
    return Object.fromEntries(Object.entries(attributes)
        .map(([name, value]) => {
            const attributeName = name in attributeNameMap ? attributeNameMap[name] : name;
            return [attributeName, value];
        })) as Attributes;
}

function usage() {
    console.info('Usage: npm start [...FILES]');
}

async function main(args: minimist.ParsedArgs) {
    const files = args._;
    if (files.length === 0) {
        return usage();
    }
    const createFiles = args.create || args.c;
    const output = !(args.output || args.o) && !createFiles;
    if (typeof createFiles === 'string') {
        await assureCreateFilesPath(createFiles);
    }
    const fileData = files
        .filter(file => file.match(/\.svg$/))
        .map(file => readSVGFile(file));
    const results = await Promise.all(fileData);
    results.map((component) => {
        generateComponent(component, createFiles, output);
    });
}

main(minimist(process.argv.slice(2)));
