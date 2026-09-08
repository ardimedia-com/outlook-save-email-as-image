/**
 * Mount check for the UI layer, run as part of `npm run smoke`.
 *
 * The render smoke test covers the export pipeline but never touches React, so a React, Radix or
 * lucide upgrade could break every control in the task pane and still leave `tsc`, the bundler
 * and the render test perfectly green. This mounts the real components and asserts they produce
 * actual DOM, and treats any console error or uncaught rejection during the mount as a failure.
 *
 * It deliberately does not stub Office.js: it exercises the presentational layer, not the
 * Office integration, which needs a real host.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { Footer } from '../../src/components/Footer';
import { Button } from '../../src/components/ui/Button';
import { Checkbox } from '../../src/components/ui/Checkbox';
import { RadioGroup } from '../../src/components/ui/RadioGroup';
import { Select } from '../../src/components/ui/Select';
import { Slider } from '../../src/components/ui/Slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/Tabs';
import { createI18n } from '../../src/lib/i18n';

function Harness() {
  const [tab, setTab] = React.useState('a');
  return (
    <div>
      <Footer i18n={createI18n('en-US')} />
      <Button onClick={() => undefined}>Press</Button>
      <Checkbox checked onCheckedChange={() => undefined} id="c" label="A checkbox" />
      <RadioGroup
        value="one"
        onValueChange={() => undefined}
        options={[
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two' },
        ]}
      />
      <Select
        value="x"
        onValueChange={() => undefined}
        options={[
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ]}
      />
      <Slider value={50} onValueChange={() => undefined} min={0} max={100} step={1} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    </div>
  );
}

/** Mount the UI and report a single PASS/FAIL line. */
export async function runMountCheck(log: (line: string) => void): Promise<void> {
  const label = 'ui    | React mount (Footer + Radix controls + icons)';
  const errors: string[] = [];

  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
    originalError(...args);
  };
  const onRejection = (event: PromiseRejectionEvent) => errors.push(String(event.reason));
  window.addEventListener('unhandledrejection', onRejection);

  const host = document.createElement('div');
  document.body.appendChild(host);

  try {
    const root = createRoot(host);
    root.render(React.createElement(Harness));
    // Let React commit and Radix run its layout effects.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rendered = host.querySelectorAll('*').length;
    if (rendered < 20) throw new Error(`only ${rendered} elements rendered`);
    if (!host.querySelector('svg')) throw new Error('no icon rendered');
    if (errors.length > 0) throw new Error(`console errors: ${errors.slice(0, 2).join(' | ')}`);

    log(`SMOKE PASS ${label} -> ${rendered} elements`);
    root.unmount();
  } catch (error: unknown) {
    log(`SMOKE FAIL ${label} -> ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    console.error = originalError;
    window.removeEventListener('unhandledrejection', onRejection);
    host.remove();
  }
}
