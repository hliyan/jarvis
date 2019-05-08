const { 
  parseCommand, 
  tokenize, 
  parseInputTokens,
  parseMacro
} = require("./src/utils");

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.activeCommand = null; // currently active command
    this.state = {}; // state variables for currently active command
    this.mode = null;
    this.macroCommand=null;
    this.input = [];
    this.macros = [];
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({command, handler, aliases}) {
    const patterns = [];
    patterns.push({tokens: parseCommand(command)});
    if (aliases) {
      aliases.forEach((alias) => {
        patterns.push({tokens: parseCommand(alias)})
      });
    }

    this.commands.push({
      command: command, 
      handler: handler,
      tokens: parseCommand(command),
      patterns
    });
  }

  /**
   * Create and store a new macro
   */
  _addMacro({ macroCommand, macro }) {
    const patterns = [];
    const args = {};
    patterns.push({ tokens: parseCommand(macroCommand) });
    this.macros.push({
      macroCommand: macroCommand,
      subCommands: parseMacro(macro),
      tokens: parseCommand(macroCommand),
      args,
      patterns
    });
    return this.macros[this.macros.length - 1].macroCommand;
  }

  /**
   * To be called only by command handlers, to indicate the start of
   * an interactive shell session
   */
  startCommand(commandName) {
    this.activeCommand = this._findCommand(commandName);
  }

  /**
   * To be called only by command handlers, to indicate the end of
   * an interactive shell session
   */
  endCommand() {
    this.activeCommand = null;
    this.state = {};
  }

  /**
   * To be called only by command handlers for an interactive shell command
   * Can be used to set variables for the duration of that shell command
   */
  setCommandState(data) {
    Object.assign(this.state, data);
  }

  _findCommand(line) {
    const inputTokens = tokenize(line);
    for (let i = 0; i < this.commands.length; i++) {
      const command = this.commands[i];
      if (parseInputTokens(command, inputTokens))
        return command;
    }
    return null;
  }

  _findMacro(line) {
    const inputTokens = tokenize(line);
    for (let i = 0; i < this.macros.length; i++) {
      const macro = this.macros[i];
      const args = parseInputTokens(macro, inputTokens);
      if (args) {
        macro.args = args.args;
        return macro;
      }
    }
    return null;
  }
  // if command is null, then consider as accepting prompted input
  // for the active command
  async _runCommand(command, line) {
    const inputTokens = tokenize(line);
    const handler = command ? command.handler : this.activeCommand.handler;

    return await handler({
      context: this,
      line,
      tokens: inputTokens,
      args: command ? parseInputTokens(command, inputTokens).args : {}
    });
  }
  // executes a macro
  async _runMacro(macro) {
    const res = [];
    const subCommands = macro.subCommands;
    for (let subCommand of subCommands) {
      let value = subCommand.match(/\$\w*/);
      if (value) {
        value = value[0].replace('$', "");
        subCommand = subCommand.replace(/\$\w*/, macro.args[value]);
      }
      const command = this._findCommand(subCommand);
      res.push(command ? await this._runCommand(command, subCommand) : null);
    }
    return res;
  }

  /**
   * Sends a command to the shell
   */
  async send(line) {
    if (this.activeCommand) {
      if (line === '..') {
        const out = 'Done with ' + this.activeCommand.command + '.';
        this.endCommand();
        return out;
      }
      return this._runCommand(null, line);
    }
    const macro = this._findMacro(line);
    if (macro) {
      return await this._runMacro(macro);
    }
    if (line.trim().startsWith("how to")) {
      this.macroCommand = line.match(/how to (.*)/)[1];
      this.mode = "macro";
      console.log(">>>Switched to macro mode>>>");
    }
    if (this.mode === "macro") {
      this.input.push(line);
      if (line==="end") {
        this.mode = "cmd";
        console.log(">>>Switched back to command mode>>>");
        const macroStr = this.input.join("\n");
        this.input.length = 0;
        return this._addMacro({ macroCommand: this.macroCommand, macro: macroStr });
      }
    } else {
      const command = this._findCommand(line);
      return command ? this._runCommand(command, line) : null;
    }
  }
}

module.exports = Jarvis;