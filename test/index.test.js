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

  test("should match the phrase exactly", async () => {
    expect(await jarvis.send("how are you")).toEqual("I'm fine");
    expect(await jarvis.send("how are")).toEqual(null);
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

describe("macro handler", () => {
  const jarvis = new Jarvis();

  jarvis.addCommand({
    command: "launch browser $browser",
    handler: ({ args: { browser } }) => {
      return "launched browser " + browser;
    }
  });

  jarvis.addCommand({
    command: "open url",
    handler: () => {
      return "opened url";
    }
  });

  jarvis.addCommand({
    command: "click login",
    handler: () => {
      return "clicked login";
    }
  });

  test("should execute a simple command", async () => {
    const res = await jarvis.send("launch browser chrome");
    expect(res).toEqual("launched browser chrome");
  });

  test("should create and store a macro", async () => {
    await jarvis.send("how to login $browser");
    await jarvis.send("launch browser $browser");
    await jarvis.send("open url");
    await jarvis.send("click login");
    const res = await jarvis.send("end");
    expect(res).toEqual("login $browser");
  });

  test("should execute a stored macro while assigning variables", async () => {
    await jarvis.send("how to login $browser");
    await jarvis.send("launch browser $browser");
    await jarvis.send("open url");
    await jarvis.send("click login");
    await jarvis.send("end");
    const res = await jarvis.send("login chrome");
    expect(res).toEqual([
      "launched browser chrome",
      "opened url",
      "clicked login"
    ]);
  });

  test("should identify an invalid command", async () => {
    await jarvis.send("how to some macro");
    await jarvis.send("invalid command");
    await jarvis.send("end");
    const res = await jarvis.send("some macro");
    expect(res).toEqual([null]);
  });

  test("should identify a macro without end", async () => {
    await jarvis.send("how to login $browser");
    const res = await jarvis.send("launch browser $browser");
    expect(res).toEqual(undefined);
  });
});
