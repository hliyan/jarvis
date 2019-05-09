const Jarvis = require("../index");

describe("basic command", async () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "simple",
    handler: ({ context, line }) => {
      return "tested: " + line;
    }
  });

  test("should return the expected output", async () => {
    expect(await jarvis.send("simple")).toEqual("tested: simple");
  });

  test("should return null for unknown command", async () => {
    expect(await jarvis.send("foo")).toBe(null);
  });

  test("should return null for undefined command", async () => {
    expect(await jarvis.send()).toBe(null);
  });

  test("should return null for empty string", async () => {
    expect(await jarvis.send("")).toBe(null);
  });
});

describe("interactive command", async () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "repl",
    handler: ({ context, line }) => {
      if (!context.activeCommand) {
        context.startCommand("repl");
        context.setCommandState({ status: "awaitInput" });
        return "Enter input: ";
      }

      if (context.state.status === "awaitInput") {
        const out = "Handled: " + line;
        return out;
      }
    }
  });

  test("should enter the mode with the keyword", async () => {
    expect(await jarvis.send("repl")).toEqual("Enter input: ");
  });

  test("should prompt for input in sequence", async () => {
    expect(await jarvis.send("bar")).toEqual("Handled: bar");
  });

  test("should exit the mode with ..", async () => {
    expect(await jarvis.send("..")).toEqual("Done with repl.");
  });
});

describe("static phrase command", () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "how are you",
    handler: ({ line, args }) => {
      return "I'm fine";
    }
  });

  jarvis.addCommand({
    command: "how are you doing",
    handler: ({ line, args }) => {
      return "I'm doing well";
    }
  });

  test("should match the phrase exactly", async () => {
    expect(await jarvis.send("how are you")).toEqual("I'm fine");
    expect(await jarvis.send("how are")).toEqual(null);
    expect(await jarvis.send("how are you doing")).toEqual("I'm doing well");
  });
});

describe("command handler", () => {
  const jarvis = new Jarvis();

  test("should receive argument array", async () => {
    jarvis.addCommand({
      command: "how are you",
      handler: ({ line, tokens }) => {
        expect(tokens).toEqual(["how", "are", "you", "doing", "John Doe"]);
        return "I'm fine";
      }
    });
    await jarvis.send('how are you doing "John Doe"');
  });
});

describe("command with args", () => {
  const jarvis = new Jarvis();

  test("should match with variables", async () => {
    jarvis.addCommand({
      command: "say hello to $name now",
      handler: ({ tokens, args }) => {
        expect(tokens).toEqual(["say", "hello", "to", "John Doe", "now"]);
        expect(args).toEqual({ name: "John Doe" });
        return `Hello ${args.name}`;
      }
    });

    expect(await jarvis.send('say hello to "John Doe" now')).toEqual(
      "Hello John Doe"
    );
  });
});

describe("aliases", () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "greet $name",
    aliases: ["hello $name how are you"],
    handler: ({ args }) => {
      return `Hello ${args.name}`;
    }
  });

  test("should match main command", async () => {
    expect(await jarvis.send('greet "John Doe"')).toEqual("Hello John Doe");
  });

  test("should match alias", async () => {
    expect(await jarvis.send('hello "John Doe" how are you')).toEqual(
      "Hello John Doe"
    );
  });
});

describe('macros', () => {
  const jarvis = new Jarvis();

  jarvis.addCommand({
    command: 'run hello',
    handler: ({ args }) => {
      return `Hello`;
    }
  });

  jarvis.addCommand({
    command: 'run world',
    handler: ({ args }) => {
      return `world`;
    }
  });

  jarvis.addCommand({
    command: 'load $language',
    handler: ({ args }) => {
      return `Running, ${args.language}`;
    }
  });

  jarvis.addCommand({
    command: 'say $string',
    handler: ({ args }) => {
      return `${args.string}`;
    }
  });

  test('initialize a macro', async () => {
    expect(await jarvis.send('how to programme'))
      .toEqual('You are now entering a macro. Type the statements, one line at a time. When done, type \'end\'.');
  });

  test('add macro with no variables', async () => {
    await jarvis.send('how to write');
    await jarvis.send('run hello');
    await jarvis.send('run world');

    expect(await jarvis.send('end'))
      .toEqual('Macro "write" has been added.');
  });

  test('run a macro', async () => {
    expect(await jarvis.send('write'))
      .toEqual(['Hello', 'world']);
  });

  test('macro with multiple variables', async () => {
    await jarvis.send('how to code $language $message');
    await jarvis.send('load $language');
    await jarvis.send('say $message')
    await jarvis.send('end');

    expect(await jarvis.send('code JavaScript "Hello World"'))
      .toEqual(['Running, JavaScript', 'Hello World']);
  });

  test('not a valid command or macro', async () => {
    await jarvis.send('how to existing macro');

    expect(await jarvis.send('invalid command'))
      .toEqual('Not a valid Command/Macro.');
  });

  test('providing a duplicate name', async () => {
    await jarvis.send('how to test $language');
    await jarvis.send('run hello');
    await jarvis.send('end');

    expect(await jarvis.send('how to test $language'))
      .toEqual(`Macro name already exists!`);
  });

  test('macro with inner macro', async () => {
    await jarvis.send('how to inner_macro $str1 $str2');
    await jarvis.send('say $str1');
    await jarvis.send('say $str2');
    await jarvis.send('end');

    await jarvis.send('how to outer_macro $string1 $string2 $string3');
    await jarvis.send('say $string1');
    await jarvis.send('inner_macro $string2 $string3');
    await jarvis.send('end');

    expect(await jarvis.send('outer_macro "Normal Command" "Inner Command 1" "Inner Command 2"'))
      .toEqual(['Normal Command', ['Inner Command 1', 'Inner Command 2']]);
  });
});
