import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliRoot = path.dirname(expoRequire.resolve('@expo/cli/package.json'));
const cliRequire = createRequire(path.join(cliRoot, 'package.json'));
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire('./build/src/start/server/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = cliRequire('./build/src/start/server/createMCPDevToolsExtensionSchema.js');

test('Expo CLI uses patched Zod and its actual devtools schemas still validate', () => {
  assert.equal(cliRequire('zod/package.json').version, '4.6.7');
  const plugin = PluginSchema.parse({
    packageName: 'samvad-test-plugin', packageRoot: '/synthetic',
    cliExtensions: { description: 'Synthetic test', entryPoint: './test.js', commands: [
      { name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [
        { name: 'limit', type: 'number' }, { name: 'enabled', type: 'confirm' }, { name: 'label', type: 'text' },
      ] },
    ] },
  });
  const schema = createMCPDevToolsExtensionSchema(plugin);
  assert.equal(schema.safeParse({ command: 'inspect', limit: 3, enabled: true, label: 'test' }).success, true);
  assert.equal(schema.safeParse({ command: 'unknown' }).success, false);
  assert.equal(schema.safeParse({ command: 'inspect', limit: 'bad' }).success, false);
  assert.equal(schema.safeParse({ command: 'inspect', unexpected: true }).success, false);
  assert.equal(PluginSchema.safeParse({ packageName: '', packageRoot: '' }).success, false);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'OK', level: 'info' }]).success, true);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'image', url: 'not-a-url' }]).success, false);
});
