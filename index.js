const {
  parseCommand,
  tokenize,
  parseInputTokens,
  parseCommandInMacro
} = require("./src/utils");

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
    const patterns = [];
    const args = {};
    patterns.push({ tokens: parseCommand(macro) });
    this.macros.push({
      macro: macro,
      commandList: commandList,
      tokens: parseCommand(macro),
      patterns,
      args
    });
  }

  /**
   * Run a  predefined macro
   * USAGE: jarvis.runMacro('login')
   */

  async runMacro(macro) {
    const currentMacro = this._findMacro(macro);
    let results = [];
    if (currentMacro) {
      const { commandList, args } = currentMacro;
      if (commandList.length > 0) {
        for (let i = 0; i < commandList.length; i++) {
          const command = parseCommandInMacro(commandList[i], args);
          if (this._findMacro(command)) {
            //if the command is macro
            const result = await this.runMacro(command);
            if (result) results = results.concat(result);
          } else {
            const result = await this.send(command);
            if (result) results.push(result);
          }
        }
      }
      if (results.length > 0) return results;
    }
    return null;
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
    const inputTokens = tokenize(macro);
    for (let i = 0; i < this.macros.length; i++) {
      const macro = this.macros[i];
      const args = parseInputTokens(macro, inputTokens);
      if (args) {
        this.macros[i].args = args.args;
        return this.macros[i];
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
      this.activeMacro = [];
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
      //add commands or pre defined macros to the macro
      if (this._findCommand(line) || this._findMacro(line)) {
        this.activeMacro.push(line);
      } else {
        return "Please enter a proper command or macro";
      }
    } else {
      const command = this._findCommand(line);
      return command ? this._runCommand(command, line) : null;
    }
  }
}

module.exports = Jarvis;
