import { renameAttributes, generateComponent } from './index';

test('renameAttributes', () => {
    expect(renameAttributes({ 'xmlns:link': 'test'})).toEqual({ 'xmlnsLink': 'test'});
});

test('generateComponent() with xmlns', async () => {
    expect(await generateComponent({
        data: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 76.08 76.08"></svg>',
        status: true,
        fileName: 'test.svg'
    }, false, false)).not.toContain('xmlns:xlink');
});
