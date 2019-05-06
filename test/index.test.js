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

describe("Macros functions", async () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "greet $name",
    aliases: ["hello $name"],
    handler: ({ args }) => {
      return `Hello ${args.name},how are you?`;
    }
  });

  jarvis.addCommand({
    command: "reply $name",
    handler: ({ args }) => {
      return `Hello ${args.name},i'm fine thank you!`;
    }
  });

  jarvis.addCommand({
    command: "end $name",
    handler: ({ args }) => {
      return `Good it was nice meeting you ${args.name}`;
    }
  });

  jarvis.addMacro({
    macro: "introduction",
    commandList: ["greet lashan", "reply dinuka", "end lashan"]
  });

  test("should run the given commands given in the macro ", async () => {
    expect(await jarvis.runMacro("introduction")).toEqual([
      "Hello lashan,how are you?",
      "Hello dinuka,i'm fine thank you!",
      "Good it was nice meeting you lashan"
    ]);
  });
});

describe("Macros using CLI", async () => {
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: "greet $name",
    aliases: ["hello $name"],
    handler: ({ args }) => {
      return `Hello ${args.name},how are you?`;
    }
  });

  jarvis.addCommand({
    command: "reply $name",
    handler: ({ args }) => {
      return `Hello ${args.name},i'm fine thank you!`;
    }
  });

  jarvis.addCommand({
    command: "end $name",
    handler: ({ args }) => {
      return `Good it was nice meeting you ${args.name}`;
    }
  });

  const macro = "test $user";
  test("should run the given commands given in the macro ", async () => {
    expect(await jarvis.send("how to " + macro)).toEqual(
      "you are now entering a macro. type the" +
        " statements, one line at a time. when done, type 'end'"
    );

    await jarvis.send("greet lashan");
    expect(await jarvis.send("fake command")).toEqual(
      "Please enter a proper command"
    );
    await jarvis.send("reply $user");
    expect(await jarvis.send("end")).toEqual(
      "macro '" + macro + "' has been added"
    );

    expect(await jarvis.send("test naruto ")).toEqual([
      "Hello lashan,how are you?",
      "Hello naruto,i'm fine thank you!"
    ]);
  });
});
