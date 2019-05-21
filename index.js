const {
  parseCommand,
  tokenize,
  parseInputTokens,
  parseMacroInputTokens,
  parseMacroSubCommand,
  parseConstants
} = require("./src/utils");

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.macros = []; // list of registered macros
    this.activeCommand = null; // currently active command
    this.activeMacro = null; // currently active macro
    this.activeConstants = null; // currently active constants
    this.state = {}; // state variables for currently active command
    this.constants = {}; // registered constants
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({ command, handler, aliases }) {
    const patterns = [];
    patterns.push({ tokens: parseCommand(command) });
    if (aliases) {
      aliases.forEach((alias) => {
        patterns.push({ tokens: parseCommand(alias) })
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
      if (parseInputTokens(command, inputTokens)) {
        return command;
      }
    }
    return null;
  }

  /**
   * if command is null, then consider as accepting prompted input
   * for the active command
   */
  async _runCommand(command, line) {
    line = parseConstants(line, this.constants);
    const inputTokens = tokenize(line);
    const handler = command ? command.handler : this.activeCommand.handler;

    return await handler({
      context: this,
      line,
      tokens: inputTokens,
      args: command ? parseInputTokens(command, inputTokens).args : {}
    });
  }

  /**
   * Sends a command to the shell
   */
  async send(line) {
    if (!line) {
      return null;
    }
    line = line.trim();

    if (this.activeCommand) {
      if (line === '..') {
        const out = 'Done with ' + this.activeCommand.command + '.';
        this.endCommand();
        return out;
      }
      return this._runCommand(null, line);
    }

    if (line.startsWith("how to")) {
      let macroCommand = line.replace('how to', '').trim();
      if (this._findMacro(macroCommand)) {
        return `Macro name already exists!`
      }

      this.activeMacro = {
        command: macroCommand,
        subCommands: []
      }

      const out = 'You are now entering a macro. Type the statements, one line at a time. When done, type \'end\'.'
      return out;
    }

    if (this.activeMacro) {
      if (line === 'end') {
        this._addMacro(this.activeMacro);
        const out = `Macro "${this.activeMacro.command}" has been added.`;
        this.activeMacro = null;
        return out;
      }

      if (this._findCommand(line) || this._findMacro(line)) {
        this.activeMacro.subCommands.push(line);
        return;
      } else {
        return `Not a valid Command/Macro.`
      }
    }

    if (line.startsWith("in this context")) {
      this.activeConstants = [];
      const out = 'You are now entering constants. Type the constants, one line at a time. When done, type \'end\'.'
      return out;
    }

    if (this.activeConstants) {
      if (line === 'end') {
        let keyList = [];
        this.activeConstants.forEach(constant => {
          this.constants[constant.key] = constant.value;
          keyList.push(constant.key);
        })

        const out = `Constants "${keyList}" have been added.`;
        this.activeConstants = null;
        return out;
      }

      let key = line.split(/ is /i)[0].trim();
      let value = line.split(/ is /i)[1].trim();

      if (key === key.toUpperCase()) {
        let constant = { key, value };
        this.activeConstants.push(constant);
        return;
      } else {
        return 'A constant name should be in block letters.'
      }
    }

    return await this._execute(line);
  }

  /**
   * if the 'line' is not found in commands
   * it will search in macros
   */
  async _execute(line) {
    const command = this._findCommand(line);
    if (command) {
      return this._runCommand(command, line);
    } else {
      const macro = this._findMacro(line);
      return macro ? await this._runMacro(macro) : null;
    }
  }

  /**
   * Register a new macro with JARVIS
   * USAGE: jarvis._addMacro(macro);
   */
  _addMacro({ command, subCommands }) {
    this.macros.push({
      command: command,
      tokens: parseCommand(command),
      subCommands: subCommands,
    })
  }

  /**
   * Execute sub commands of the macro
   */
  async _runMacro(macro) {
    let subCommandsStatus = [];
    for (let line of macro.subCommands) {
      line = parseConstants(line, this.constants);
      line = parseMacroSubCommand(line, macro.args);
      subCommandsStatus.push(await this._execute(line));
    }
    return subCommandsStatus;
  }

  /**
   * Find the macro by sending macro name
   */
  _findMacro(line) {
    line = parseConstants(line, this.constants);
    const inputTokens = tokenize(line);
    for (let i = 0; i < this.macros.length; i++) {
      const macro = this.macros[i];
      const args = parseMacroInputTokens(macro, inputTokens);
      if (args)
        return Object.assign({}, macro, args)
    }
    return null;
  }
}

module.exports = Jarvis;