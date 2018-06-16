const Jarvis = require('../index');

const jarvis = new Jarvis();

jarvis.addCommand({
  command: 'test',
  handler: (context, data) => {
    return 'tested: ' + data;
  }
});

jarvis.addCommand({
  command: 'test2',
  handler: (context, data) => {
    if (context.activeCommand === null) {
      context.start('test2');
      context.setState({status: 'awaitInput'});
      return 'Enter input: ';
    }

    if (context.state.status === 'awaitInput') {
      const out = 'Handled: ' + data;
      context.end();
      return out;
    }

  }
});

test('jest', async () => {
  let out = null;
  out = await jarvis.send('test');
  expect(out).toEqual('tested: test');
  out = await jarvis.send('foo');
  expect(out).toBe(null);
});

test('test2', async () => {
  let out = null;
  out = await jarvis.send('test2');
  expect(out).toEqual('Enter input: ');
  out = await jarvis.send('bar');
  expect(out).toEqual('Handled: bar');
});

