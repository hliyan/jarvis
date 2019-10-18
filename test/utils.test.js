const {
  parseCommand,
  tokenize,
  parseInputTokens,
  parseMacroInputTokens,
  parseMacroSubCommand,
  parseScript
} = require("../src/utils");

describe('tokenize', () => {

  test('double quoted strings', () => {
    expect(tokenize('hello world "Hello World"'))
      .toEqual(['hello', 'world', 'Hello World']);
  });

  test('double quoted strings with punctuation', () => {
    expect(tokenize('hello world "Hello, World"'))
      .toEqual(['hello', 'world', 'Hello, World']);
  });

  // TODO
  test('double quoted strings with escaped double quotes', () => {
    //expect(tokenize('hello world "Hello \"World\""'))
    //  .toEqual(['hello', 'world', 'Hello \"World\"']);
  });

});

describe('parseCommand', () => {

  test('basic command', () => {
    expect(parseCommand('hello $name'))
      .toEqual([
        { value: 'hello', isArg: false }, { value: 'name', isArg: true }
      ]);
  });

  test('basic command with infix', () => {
    expect(parseCommand('hello $name how are you'))
      .toEqual([
        { value: 'hello', isArg: false },
        { value: 'name', isArg: true },
        { value: 'how', isArg: false },
        { value: 'are', isArg: false },
        { value: 'you', isArg: false }
      ]);
  });
});

describe('macros', () => {
  test('macro input tokens validation with no variables', () => {
    expect(parseMacroInputTokens(
      {
        tokens: [
          { value: 'how', isArg: false },
          { value: 'to', isArg: false },
          { value: 'programme', isArg: false }
        ]
      },
      ['how', 'to', 'programme']
    ))
      .toEqual({ args: {} });
  });

  test('macro input tokens mismatch', () => {
    expect(parseMacroInputTokens(
      {
        tokens: [
          { value: 'how', isArg: false },
          { value: 'to', isArg: false },
          { value: 'programme', isArg: false }
        ]
      },
      ['how', 'to', 'login']
    ))
      .toEqual(null);
  });

  test('macro input tokens validation with variables', () => {
    expect(parseMacroInputTokens(
      {
        tokens: [
          { value: 'how', isArg: false },
          { value: 'to', isArg: false },
          { value: 'programme', isArg: false },
          { value: 'language', isArg: true }
        ]
      },
      ['how', 'to', 'programme', 'JavaScript']
    ))
      .toEqual({ args: { language: 'JavaScript' } });
  });

  test('macro sub command with no variables', () => {
    expect(parseMacroSubCommand('run hello', {}))
      .toEqual('run hello');
  });

  test('macro sub command with variables', () => {
    expect(parseMacroSubCommand('run $code', { code: "Hello World" }))
      .toEqual("run \"Hello World\"");
  });

  test('macro sub command with missing variable in args', () => {
    expect(parseMacroSubCommand('run $code', {}))
      .toEqual("run $code");
  });
});

describe("scripts", () => {
  test("single line comments", () => {
    expect(parseScript(`${__dirname}/resources/test.jarvis`))
      .toEqual(["run hello", "run world", "load JavaScript", "say Bye"]);
  });
}); 