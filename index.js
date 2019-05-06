const { parseCommand, tokenize, parseInputTokens } = require("./src/utils");

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.macros = []; //list of macros
    this.activeCommand = null; // currently active command
    this.state = {}; // state variables for currently active command
    this.isMacroActive = false; //currently active macro
    this.activeMacro = []; //temperary variable to collect macro commands
    this.macroName = ""; //temperary variable to keep macro name
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({ command, handler, aliases }) {
    const patterns = [];
    patterns.push({ tokens: parseCommand(command) });
    if (aliases) {
      aliases.forEach(alias => {
        patterns.push({ tokens: parseCommand(alias) });
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
   * Registers a new macro with Jarvis
   * USAGE: jarvis.addMacro({ macro: 'login',
   *          commandList:['launch chrome','open google.lk'] });
   */
  addMacro({ macro, commandList }) {
    this.macros.push({
      macro: macro,
      commandList: commandList
    });
  }


   /**
   * Run a  predefined macro
   * USAGE: jarvis.runMacro('login')
   */
  async runMacro(macro) {
    const commandList = this._findMacro(macro);
    let results = [];
    if (commandList) {
      for (let i = 0; i < commandList.length; i++) {
        results.push(await this.send(commandList[i]));
      }
      return results;
    }
  }

  /**
   * Registers a new macro with Jarvis
   * USAGE: jarvis.addMacro({ macro: 'login',
   *          commandList:['launch chrome','open google.lk'] });
   */
  addMacro({ macro, commandList }) {
    this.macros.push({
      macro: macro,
      commandList: commandList
    });
  }

  /**
   * Run a  predefined macro
   * USAGE: jarvis.runMacro('login')
   */
  async runMacro(macro) {
    const commandList = this._findMacro(macro);
    let results = [];
    if (commandList) {
      for (let i = 0; i < commandList.length; i++) {
        results.push(await this.send(commandList[i]));
      }
      return results;
    }
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
   * end of an macro
   */
  endMacro() {
    this.isMacroActive = false;
    this.activeMacro = [];
    this.macroName = "";
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
      if (parseInputTokens(command, inputTokens)) return command;
    }
    return null;
  }

  _findMacro(macro) {
    for (let i = 0; i < this.macros.length; i++) {
      if (macro === this.macros[i].macro) return this.macros[i].commandList;
    }
    return null;
  }

  _findMacro(macro) {
    for (let i = 0; i < this.macros.length; i++) {
      if (macro === this.macros[i].macro) return this.macros[i].commandList;
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

  /**
   * Sends a command to the shell
   */
  async send(line) {
    if (this.activeCommand) {
      if (line === "..") {
        const out = "Done with " + this.activeCommand.command + ".";
        this.endCommand();
        return out;
      }
      return this._runCommand(null, line);
    }

    if (line.startsWith("how to")) {
      //identify the start of a macro

      this.macroName = line.substr(6).trim();
      this.isMacroActive = true;
      return "you are now entering a macro. type the statements, one line at a time. when done, type 'end'";
    }

    if (!this.isMacroActive && this._findMacro(line)) {
      //run macro if we are not currently adding a macro
      return await this.runMacro(line);
    } else if (this.isMacroActive && line === "end") {
      //end of macro
      this.addMacro({ macro: this.macroName, commandList: this.activeMacro });
      const macroName = this.macroName;
      this.endMacro();
      return "macro '" + macroName + "' has been added";
    } else if (this.isMacroActive && line) {
      //add commands to macro
      const command = this._findCommand(line);
      if (command) {
        this.activeMacro.push(line);
      } else {
        return "Please enter a proper command";
      }
    } else {
      const command = this._findCommand(line);
      return command ? this._runCommand(command, line) : null;
    }
  }
}

module.exports = Jarvis;
