import Debug from 'debug';
import { readFile } from 'fs';
import { basename } from 'path';
import { promisify } from 'util';
import { Builder, parseString } from 'xml2js';

const readFilePromise = promisify(readFile);
const parseStringPromise = promisify(parseString);

const d = Debug('generate-svg-component');

function readSVGFile(fileName) {
    return readFilePromise(fileName, 'utf8')
        .then(data => ({ status: true, data, fileName }))
}

async function generateComponent(fileData) {
    d('generateComponent', fileData);
    const xml = await parseStringPromise(fileData.data.trim());
    const builder = new Builder({ headless: true });
    const component: any = {};
    walkSVG(xml, component);
    const svg = builder.buildObject(component);
    const componentName = getComponentName(fileData);

    console.log(`\n\n============================================\n\n`);
    console.log(`import React from 'react';\n\nexport function ${componentName}() {\n    return (${svg});\n}\n`);
}

function getComponentName(fileData) {
    const { fileName } = fileData;
    const nameOnly = basename(fileName).replace(/\.svg/i, '');
    return `${nameOnly.charAt(0).toUpperCase()}${nameOnly.slice(1)}`;
}

const ignoredElements = ['g'];

declare global {
  interface ObjectConstructor {
    fromEntries(xs: [string|number|symbol, any][]): object
  }
}

function walkSVG(xml, component) {
    const entries = Object.entries(xml);
    entries
        .forEach((entry) => {
            const [tag, children] = entry;

            if (!ignoredElements.includes(tag)) {
                if (!(tag in component)) {
                    component[tag] = {} as any;
                }
                else if (tag in component && !Array.isArray(component[tag])) {
                    const currentValue = component[tag];
                    component[tag] = [currentValue];
                }

                const thisComponent = {} as any;
                if ('$' in (children as any)) {
                    thisComponent['$'] = filterAttributes(children['$'])
                }

                if (Array.isArray(component[tag])) {
                    component[tag].push(thisComponent);
                }
                else {
                    component[tag] = thisComponent;
                }
            }


            const parent = tag in component ? component[tag] : component;

            Object.entries(children)
                .filter(([childTag, ]) => childTag !== '$')
                .forEach(([childTag, ]) => {
                    // d({ childTag, tag, child: children[childTag], comp: component[tag], details });
                    if (Array.isArray(children[childTag])) {
                        children[childTag].forEach((thisChild: any) => {
                            walkSVG({ [childTag]: {...thisChild} }, parent);
                        });
                        return;
                    }
                    walkSVG(children[childTag], component[tag]);
                })
        });
}

const ignoredAttributes = ['id', 'path-name', 'data-name'];

function filterAttributes(attributes: any) {
    return Object.fromEntries(Object.entries(attributes)
        .filter(([name, value]) => !ignoredAttributes.includes(name)))
}

async function main(files: string[]) {
    const fileData = files
        .filter(file => file.match(/\.svg$/))
        .map(file => readSVGFile(file));
    const results = await Promise.all(fileData);
    results.map(generateComponent);
}

main(process.argv.slice(2));
