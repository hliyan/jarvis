const Jarvis = require('../index');

const jarvis = new Jarvis();

jarvis.addCommand({
  command: 'simple',
  handler: (context, data) => {
    return 'tested: ' + data;
  }
});

jarvis.addCommand({
  command: 'repl',
  handler: (context, data) => {
    if (!context.activeCommand) {
      context.startCommand('repl');
      context.setCommandState({status: 'awaitInput'});
      return 'Enter input: ';
    }

    if (context.state.status === 'awaitInput') {
      const out = 'Handled: ' + data;
      return out;
    }

  }
});

test('basic command', async () => {
  let out = null;
  out = await jarvis.send('simple');
  expect(out).toEqual('tested: simple');
  out = await jarvis.send('foo');
  expect(out).toBe(null);
});

test('interactive command', async () => {
  let out = null;
  out = await jarvis.send('repl');
  expect(out).toEqual('Enter input: ');
  out = await jarvis.send('bar');
  expect(out).toEqual('Handled: bar');
  out = await jarvis.send('..');
  expect(out).toEqual('Done with repl.');
});

