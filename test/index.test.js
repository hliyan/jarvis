const Jarvis = require('../index');

describe('basic command', async () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: 'simple',
    handler: (context, data) => {
      return 'tested: ' + data;
    }
  });

  test('should return the expected output', async () => {
    expect(await jarvis.send('simple')).toEqual('tested: simple');
  });

  test('should return null for unknown command', async () => {
    expect(await jarvis.send('foo')).toBe(null);  
  });

});

describe('interactive command', async () => {
  const jarvis = new Jarvis();
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

  test('should enter the mode with the keyword', async () => {
    expect(await jarvis.send('repl')).toEqual('Enter input: ');
  });

  test('should prompt for input in sequence', async () => {
    expect(await jarvis.send('bar')).toEqual('Handled: bar');
  });

  test('should exit the mode with ..', async () => {
    expect(await jarvis.send('..')).toEqual('Done with repl.');
  });
});


